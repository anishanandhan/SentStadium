"""Synthetic data generator for StadiumPulse.

Generates realistic stadium zone data with:
- Gradual density increases following event lifecycle
- Heat index following a diurnal curve
- Occasional spikes (goals, halftime, weather changes)
- Occasional sensor gaps (None values) for edge-case testing
- Randomized but realistic — no static arrays on loop
"""

from __future__ import annotations

import math
import random
from datetime import UTC, datetime, timedelta
from typing import cast

from app.models.zone import RiskLevel, ZoneData, ZoneTrend

# Zone definitions — configurable stadium layout
ZONE_CONFIGS: list[dict[str, object]] = [
    {
        "zone_id": "zone-a",
        "zone_name": "Gate A — North Stand",
        "capacity": 8000,
        "has_shade": True,
        "has_hydration_point": True,
        "base_languages": ["en", "es"],
    },
    {
        "zone_id": "zone-b",
        "zone_name": "Gate B — East Wing",
        "capacity": 6500,
        "has_shade": False,
        "has_hydration_point": True,
        "base_languages": ["en", "fr"],
    },
    {
        "zone_id": "zone-c",
        "zone_name": "Gate C — South Stand",
        "capacity": 9000,
        "has_shade": False,
        "has_hydration_point": False,
        "base_languages": ["en", "es", "pt"],
    },
    {
        "zone_id": "zone-d",
        "zone_name": "Gate D — West Wing",
        "capacity": 7000,
        "has_shade": True,
        "has_hydration_point": True,
        "base_languages": ["en", "ar"],
    },
    {
        "zone_id": "zone-e",
        "zone_name": "Gate E — VIP Concourse",
        "capacity": 3000,
        "has_shade": True,
        "has_hydration_point": True,
        "base_languages": ["en", "fr", "ar"],
    },
    {
        "zone_id": "zone-f",
        "zone_name": "Gate F — Family Section",
        "capacity": 5000,
        "has_shade": True,
        "has_hydration_point": True,
        "base_languages": ["en", "es", "de"],
    },
]

# Historical incident patterns by zone
HISTORICAL_INCIDENTS: dict[str, list[str]] = {
    "zone-a": [
        "Shade-seeking spike observed when heat index exceeds 35°C",
        "Entry bottleneck during pre-match rush (T-30 min)",
    ],
    "zone-b": [
        "No shade coverage — density drops sharply above 38°C as fans relocate",
        "Hydration station queuing causes localized congestion",
    ],
    "zone-c": [
        "Highest heat exposure zone — shade-seeking migration to Zone A/D at 36°C+",
        "Post-goal surge pattern: density spikes 15-20% within 3 minutes of goal",
        "No hydration point — medical incidents correlate with prolonged high heat",
    ],
    "zone-d": [
        "Receives overflow from Zone C during heat events",
        "Shade availability makes this a natural refuge — plan for surge capacity",
    ],
    "zone-e": [
        "Low-density zone but VIP egress conflicts with general crowd flow",
        "Air-conditioned concourse creates bottleneck at entry/exit points",
    ],
    "zone-f": [
        "Family section: slower evacuation pace, stroller congestion at gates",
        "Children more vulnerable to heat — lower threshold for medical alerts",
    ],
}


class SyntheticDataGenerator:
    """Generates realistic, randomized stadium zone data."""

    def __init__(self, seed: int | None = None) -> None:
        self._rng = random.Random(seed)  # nosec B311
        self._base_time = datetime.now(UTC)

    def generate_zones(self) -> list[ZoneData]:
        """Generate initial zone states with realistic variation."""
        zones: list[ZoneData] = []
        for config in ZONE_CONFIGS:
            density = self._rng.uniform(20.0, 75.0)
            heat = self._generate_heat_index()
            capacity = cast("int", config["capacity"])
            occupancy = int(capacity * density / 100)
            entry_rate = self._rng.uniform(5.0, 40.0)

            zone = ZoneData(
                zone_id=str(config["zone_id"]),
                zone_name=str(config["zone_name"]),
                crowd_density=round(density, 1),
                heat_index=round(heat, 1),
                entry_rate=round(entry_rate, 1),
                risk_level=self._compute_risk(density, heat),
                capacity=capacity,
                current_occupancy=occupancy,
                has_shade=bool(config["has_shade"]),
                has_hydration_point=bool(config["has_hydration_point"]),
                languages_present=cast("list[str]", config["base_languages"]),
                last_updated=self._base_time,
            )
            zones.append(zone)
        return zones

    def generate_trend_history(
        self,
        zone_id: str,
        minutes: int = 15,
        interval_seconds: int = 15,
    ) -> list[ZoneTrend]:
        """Generate a realistic trend history for sparkline charts."""
        points: list[ZoneTrend] = []
        num_points = (minutes * 60) // interval_seconds

        # Start conditions
        base_density = self._rng.uniform(30.0, 60.0)
        base_heat = self._generate_heat_index()
        base_entry = self._rng.uniform(10.0, 30.0)

        # Trend direction (slight upward bias to simulate approaching event)
        density_drift = self._rng.uniform(-0.1, 0.4)
        heat_drift = self._rng.uniform(-0.05, 0.15)

        for i in range(num_points):
            ts = self._base_time - timedelta(seconds=(num_points - i) * interval_seconds)

            # Add noise + drift
            density = base_density + (density_drift * i) + self._rng.gauss(0, 1.5)
            density = max(0.0, min(100.0, density))

            heat = base_heat + (heat_drift * i) + self._rng.gauss(0, 0.3)

            entry = base_entry + self._rng.gauss(0, 3.0)
            entry = max(0.0, entry)

            # Occasional sensor gap (simulate dropout)
            if self._rng.random() < 0.03:  # 3% chance of sensor gap
                continue

            points.append(
                ZoneTrend(
                    timestamp=ts,
                    crowd_density=round(density, 1),
                    heat_index=round(heat, 1),
                    entry_rate=round(entry, 1),
                )
            )

        return points

    def tick(self, current_zones: list[ZoneData]) -> list[ZoneData]:
        """Advance the simulation by one tick — produces new zone states.

        Each tick adds realistic variation: gradual drift, occasional spikes,
        heat following diurnal pattern, inter-zone migration effects.
        """
        updated: list[ZoneData] = []
        now = datetime.now(UTC)

        for zone in current_zones:
            # Density: gradual drift + random noise + occasional spike
            density_delta = self._rng.gauss(0.3, 1.5)  # slight upward trend
            if self._rng.random() < 0.05:  # 5% chance of spike
                density_delta += self._rng.uniform(5.0, 15.0)

            # Heat-driven migration: if zone has no shade and heat is high,
            # density decreases (fans leave for shaded zones)
            if not zone.has_shade and zone.heat_index > 36.0:
                density_delta -= self._rng.uniform(1.0, 4.0)

            new_density = max(0.0, min(100.0, zone.crowd_density + density_delta))

            # Heat: small diurnal variation
            hour = now.hour + now.minute / 60.0
            diurnal = 2.0 * math.sin((hour - 6) * math.pi / 12)  # peaks at noon
            heat_delta = self._rng.gauss(0, 0.3) + diurnal * 0.1
            new_heat = zone.heat_index + heat_delta

            # Entry rate: varies with density pressure
            new_entry = max(0.0, zone.entry_rate + self._rng.gauss(0, 3.0))

            new_occupancy = int(zone.capacity * new_density / 100)
            new_risk = self._compute_risk(new_density, new_heat)

            updated.append(
                zone.model_copy(
                    update={
                        "crowd_density": round(new_density, 1),
                        "heat_index": round(new_heat, 1),
                        "entry_rate": round(new_entry, 1),
                        "current_occupancy": new_occupancy,
                        "risk_level": new_risk,
                        "last_updated": now,
                    }
                )
            )

        return updated

    def _generate_heat_index(self) -> float:
        """Generate a realistic heat index (°C) — biased toward hot conditions."""
        # FIFA 2026 summer conditions: 28-42°C range
        return self._rng.gauss(36.0, 4.0)

    @staticmethod
    def _compute_risk(density: float, heat_index: float) -> RiskLevel:
        """Compute risk level from density and heat — simple rules for initial classification.

        The AI reasoning layer adds the nuanced, multi-signal correlation on top.
        """
        high_density = density > 80.0
        elevated_density = density > 50.0
        high_heat = heat_index > 38.0
        elevated_heat = heat_index > 34.0

        if high_density and high_heat:
            return RiskLevel.CRITICAL
        if high_density or (elevated_density and high_heat):
            return RiskLevel.HIGH
        if elevated_density or elevated_heat:
            return RiskLevel.MODERATE
        return RiskLevel.LOW

    @staticmethod
    def get_historical_incidents(zone_id: str) -> list[str]:
        """Return historical incident patterns for a zone."""
        return HISTORICAL_INCIDENTS.get(zone_id, [])

    @staticmethod
    def get_zone_configs() -> list[dict[str, object]]:
        """Return the zone configuration data."""
        return ZONE_CONFIGS
