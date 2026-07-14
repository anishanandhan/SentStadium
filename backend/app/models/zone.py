"""Zone data models for StadiumPulse."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class RiskLevel(StrEnum):
    """Risk classification for a stadium zone."""

    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class ZoneTrend(BaseModel):
    """A single data point in a zone's trend history."""

    timestamp: datetime
    crowd_density: float = Field(ge=0.0, le=100.0, description="Crowd density as percentage")
    heat_index: float = Field(description="Heat index in Celsius")
    entry_rate: float = Field(ge=0.0, description="Fans entering per minute")


class ZoneData(BaseModel):
    """Current state of a single stadium zone — used in the zone list endpoint."""

    zone_id: str = Field(min_length=1, description="Unique zone identifier, e.g. 'zone-a'")
    zone_name: str = Field(min_length=1, description="Human-readable name, e.g. 'Gate A — North Stand'")
    crowd_density: float = Field(ge=0.0, le=100.0, description="Current crowd density %")
    heat_index: float = Field(description="Current heat index °C")
    entry_rate: float = Field(ge=0.0, description="Current entry rate fans/min")
    risk_level: RiskLevel = Field(description="Computed risk classification")
    capacity: int = Field(gt=0, description="Max capacity of this zone")
    current_occupancy: int = Field(ge=0, description="Current number of fans in zone")
    has_shade: bool = Field(description="Whether zone has significant shade coverage")
    has_hydration_point: bool = Field(description="Whether zone has a hydration station")
    languages_present: list[str] = Field(
        default_factory=lambda: ["en"],
        description="ISO 639-1 language codes detected/configured for this zone",
    )
    last_updated: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ZoneHistory(BaseModel):
    """Historical trend data for a zone — used in sparklines and charts."""

    zone_id: str
    trends: list[ZoneTrend] = Field(default_factory=list)
    window_minutes: int = Field(default=15, description="Time window of the trend data")


class ZoneDetail(BaseModel):
    """Full zone detail including current state and trend history."""

    zone: ZoneData
    history: ZoneHistory
    latest_recommendation: dict[str, object] | None = Field(
        default=None,
        description="Latest AI recommendation for this zone (ReasoningOutput shape)",
    )
