"""Reasoning data models for StadiumPulse GenAI integration."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ReasoningInput(BaseModel):
    """Structured input assembled for the Gemini reasoning call.

    Combines multiple independent signals for genuine multi-signal correlation.
    """

    zone_id: str = Field(min_length=1)
    zone_name: str = Field(default="")
    crowd_density: float = Field(ge=0.0, le=100.0, description="Current density %")
    crowd_density_trend: list[float] = Field(
        default_factory=list,
        description="Last 15 min density readings (oldest → newest)",
    )
    heat_index: float = Field(description="Current heat index °C")
    heat_index_trend: list[float] = Field(
        default_factory=list,
        description="Last 15 min heat index readings",
    )
    entry_rate: float = Field(ge=0.0, description="Current fan entry rate per minute")
    capacity: int = Field(gt=0)
    current_occupancy: int = Field(ge=0)
    has_shade: bool = Field(default=False)
    has_hydration_point: bool = Field(default=False)
    languages_present: list[str] = Field(default_factory=lambda: ["en"])
    time_to_event: str = Field(
        default="unknown",
        description="Time context, e.g. '30 min to kickoff', 'halftime', 'post-match'",
    )
    neighboring_zones: list[NeighborZoneSummary] = Field(
        default_factory=list,
        description="Summary of adjacent zones for redirect reasoning",
    )
    historical_incidents: list[str] = Field(
        default_factory=list,
        description="Past incident patterns for this zone, e.g. 'shade-seeking spike at 35°C+' ",
    )


class NeighborZoneSummary(BaseModel):
    """Lightweight summary of an adjacent zone for cross-zone reasoning."""

    zone_id: str
    zone_name: str = Field(default="")
    crowd_density: float = Field(ge=0.0, le=100.0)
    heat_index: float
    has_shade: bool = Field(default=False)
    has_hydration_point: bool = Field(default=False)
    entry_rate: float = Field(ge=0.0, default=0.0)


class SuggestedAction(BaseModel):
    """A single suggested action from the reasoning output."""

    action: str = Field(min_length=1, description="Plain-English action description")
    priority: Literal["immediate", "soon", "monitor"] = Field(default="soon")


class ReasoningOutput(BaseModel):
    """Structured response from the Gemini reasoning engine.

    This is the exact JSON contract the model must produce (Section 4.2).
    multilingual_alerts uses a dynamic dict — keys are whatever language
    codes are present in the zone, NOT a fixed set.
    """

    zone_id: str = Field(min_length=1)
    severity: Literal["low", "moderate", "high", "critical"]
    recommendation: str = Field(
        min_length=1,
        description="Plain English, one sentence, actionable recommendation",
    )
    reasoning: str = Field(
        min_length=1,
        description="Explicit chain: signal A + signal B => inference. This is the XAI trail.",
    )
    suggested_actions: list[str] = Field(
        min_length=1,
        description="Concrete actions staff can take",
    )
    multilingual_alerts: dict[str, str] = Field(
        description=(
            "Dynamic map of language code → alert text. Keys are driven by "
            "the zone's languages_present list, NOT a fixed set. "
            "E.g. {'en': '...', 'ar': '...', 'fr': '...'} for one zone, "
            "{'en': '...', 'es': '...'} for another."
        ),
    )
    confidence: float = Field(ge=0.0, le=1.0)


# Re-export for forward reference resolution
ReasoningInput.model_rebuild()
