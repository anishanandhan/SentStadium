"""Upload/data-ingestion models for StadiumPulse."""

from __future__ import annotations

from datetime import datetime
from typing import Any, cast

from pydantic import BaseModel, Field, field_validator


class UploadRow(BaseModel):
    """A single row of uploaded zone data — the expected schema for CSV/JSON uploads."""

    zone_id: str = Field(min_length=1, description="Zone identifier, e.g. 'zone-a'")
    timestamp: datetime = Field(description="ISO 8601 timestamp for this reading")
    crowd_density: float = Field(ge=0.0, le=100.0, description="Density percentage")
    heat_index: float = Field(description="Heat index in Celsius")
    entry_rate: float = Field(ge=0.0, default=0.0, description="Fans entering per minute")
    current_occupancy: int | None = Field(default=None, description="Optional: current count")
    capacity: int | None = Field(default=None, description="Optional: zone capacity override")
    languages_present: list[str] | None = Field(
        default=None,
        description="Optional: ISO 639-1 codes for languages in this zone",
    )

    @field_validator("languages_present", mode="before")
    @classmethod
    def parse_languages(cls, v: Any) -> list[str] | None:
        if isinstance(v, str):
            return [lang.strip() for lang in v.split(";") if lang.strip()]
        if isinstance(v, list):
            return [str(lang).strip() for lang in v if lang]
        return cast("list[str] | None", v)


class UploadValidationError(BaseModel):
    """Describes a single validation error in an uploaded file."""

    row: int = Field(ge=0, description="Row number (0-indexed for header, 1+ for data)")
    field: str = Field(description="Field name that failed validation")
    message: str = Field(description="Human-readable error description")
    value: str | None = Field(default=None, description="The problematic value, if available")


class UploadResult(BaseModel):
    """Result of a data upload operation."""

    success: bool
    filename: str = Field(default="")
    rows_accepted: int = Field(ge=0, default=0)
    rows_rejected: int = Field(ge=0, default=0)
    errors: list[UploadValidationError] = Field(default_factory=list)
    message: str = Field(default="")
