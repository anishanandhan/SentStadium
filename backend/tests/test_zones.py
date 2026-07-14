"""Tests for zone data — including missing/null fields edge case."""

from __future__ import annotations

import pytest

from app.models.zone import RiskLevel, ZoneData
from app.services.synthetic_data import SyntheticDataGenerator


class TestZoneDataValidation:
    """Test ZoneData model validation."""

    def test_valid_zone(self) -> None:
        zone = ZoneData(
            zone_id="zone-a",
            zone_name="Gate A",
            crowd_density=50.0,
            heat_index=35.0,
            entry_rate=20.0,
            risk_level=RiskLevel.MODERATE,
            capacity=8000,
            current_occupancy=4000,
            has_shade=True,
            has_hydration_point=True,
        )
        assert zone.zone_id == "zone-a"
        assert zone.risk_level == RiskLevel.MODERATE

    def test_density_boundary_zero(self) -> None:
        zone = ZoneData(
            zone_id="zone-x",
            zone_name="Empty Zone",
            crowd_density=0.0,
            heat_index=25.0,
            entry_rate=0.0,
            risk_level=RiskLevel.LOW,
            capacity=5000,
            current_occupancy=0,
            has_shade=True,
            has_hydration_point=True,
        )
        assert zone.crowd_density == 0.0

    def test_density_boundary_hundred(self) -> None:
        zone = ZoneData(
            zone_id="zone-y",
            zone_name="Full Zone",
            crowd_density=100.0,
            heat_index=40.0,
            entry_rate=0.0,
            risk_level=RiskLevel.CRITICAL,
            capacity=5000,
            current_occupancy=5000,
            has_shade=False,
            has_hydration_point=False,
        )
        assert zone.crowd_density == 100.0

    def test_density_over_hundred_rejected(self) -> None:
        with pytest.raises(ValueError):
            ZoneData(
                zone_id="zone-z",
                zone_name="Overflow",
                crowd_density=110.0,
                heat_index=35.0,
                entry_rate=10.0,
                risk_level=RiskLevel.CRITICAL,
                capacity=5000,
                current_occupancy=5500,
                has_shade=False,
                has_hydration_point=False,
            )

    def test_negative_capacity_rejected(self) -> None:
        with pytest.raises(ValueError):
            ZoneData(
                zone_id="zone-a",
                zone_name="Invalid",
                crowd_density=50.0,
                heat_index=35.0,
                entry_rate=10.0,
                risk_level=RiskLevel.LOW,
                capacity=-100,
                current_occupancy=0,
                has_shade=True,
                has_hydration_point=True,
            )


class TestSyntheticDataGenerator:
    """Test that the generator produces valid, varied data."""

    def test_generates_all_zones(self) -> None:
        gen = SyntheticDataGenerator(seed=42)
        zones = gen.generate_zones()
        assert len(zones) == 6  # 6 zones configured
        ids = {z.zone_id for z in zones}
        assert "zone-a" in ids
        assert "zone-f" in ids

    def test_zones_have_valid_data(self) -> None:
        gen = SyntheticDataGenerator(seed=42)
        zones = gen.generate_zones()
        for zone in zones:
            assert 0.0 <= zone.crowd_density <= 100.0
            assert zone.heat_index > 0  # Realistic temperatures
            assert zone.entry_rate >= 0
            assert zone.capacity > 0
            assert zone.current_occupancy >= 0

    def test_different_seeds_produce_different_data(self) -> None:
        gen1 = SyntheticDataGenerator(seed=1)
        gen2 = SyntheticDataGenerator(seed=2)
        zones1 = gen1.generate_zones()
        zones2 = gen2.generate_zones()
        # At least one field should differ
        densities1 = [z.crowd_density for z in zones1]
        densities2 = [z.crowd_density for z in zones2]
        assert densities1 != densities2

    def test_trend_history_generation(self) -> None:
        gen = SyntheticDataGenerator(seed=42)
        trends = gen.generate_trend_history("zone-a", minutes=15)
        # Should have multiple data points (some may be missing due to simulated sensor gaps)
        assert len(trends) > 30  # At least 30 of ~60 points

    def test_tick_produces_variation(self) -> None:
        gen = SyntheticDataGenerator(seed=42)
        zones = gen.generate_zones()
        updated = gen.tick(zones)
        assert len(updated) == len(zones)
        # At least some values should change
        changes = sum(
            1 for a, b in zip(zones, updated, strict=True) if a.crowd_density != b.crowd_density
        )
        assert changes > 0

    def test_risk_level_computation_boundaries(self) -> None:
        # high_density > 80.0, high_heat > 38.0 => CRITICAL
        assert SyntheticDataGenerator._compute_risk(80.1, 38.1) == RiskLevel.CRITICAL
        # exact boundaries should not be CRITICAL
        assert SyntheticDataGenerator._compute_risk(80.0, 38.1) == RiskLevel.HIGH
        assert SyntheticDataGenerator._compute_risk(80.1, 38.0) == RiskLevel.HIGH

        # high_density or (elevated_density and high_heat) => HIGH
        # elevated_density > 50.0
        assert SyntheticDataGenerator._compute_risk(50.1, 38.1) == RiskLevel.HIGH
        assert SyntheticDataGenerator._compute_risk(50.0, 38.1) == RiskLevel.MODERATE
        assert SyntheticDataGenerator._compute_risk(80.1, 30.0) == RiskLevel.HIGH

        # elevated_density or elevated_heat => MODERATE
        # elevated_heat > 34.0
        assert SyntheticDataGenerator._compute_risk(50.1, 30.0) == RiskLevel.MODERATE
        assert SyntheticDataGenerator._compute_risk(30.0, 34.1) == RiskLevel.MODERATE
        assert SyntheticDataGenerator._compute_risk(50.0, 34.0) == RiskLevel.LOW

        # below all thresholds => LOW
        assert SyntheticDataGenerator._compute_risk(30.0, 30.0) == RiskLevel.LOW

    def test_get_historical_incidents(self) -> None:
        incidents = SyntheticDataGenerator.get_historical_incidents("zone-a")
        assert len(incidents) == 2
        assert "Shade-seeking spike observed when heat index exceeds 35°C" in incidents
        assert SyntheticDataGenerator.get_historical_incidents("non-existent") == []

    def test_get_zone_configs(self) -> None:
        configs = SyntheticDataGenerator.get_zone_configs()
        assert len(configs) == 6
        assert configs[0]["zone_id"] == "zone-a"
