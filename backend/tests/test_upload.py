"""Tests for data upload — validation, edge cases, parsing."""

from __future__ import annotations

import json

import pytest

from app.models.upload import UploadResult, UploadRow, UploadValidationError


class TestUploadRowValidation:
    """Test UploadRow Pydantic model against various inputs."""

    def test_valid_row(self) -> None:
        row = UploadRow(
            zone_id="zone-a",
            timestamp="2026-07-10T14:30:00Z",  # type: ignore[arg-type]
            crowd_density=72.5,
            heat_index=38.2,
            entry_rate=25.0,
        )
        assert row.zone_id == "zone-a"
        assert row.crowd_density == 72.5

    def test_density_out_of_range(self) -> None:
        with pytest.raises(ValueError):
            UploadRow(
                zone_id="zone-a",
                timestamp="2026-07-10T14:30:00Z",  # type: ignore[arg-type]
                crowd_density=150.0,  # > 100
                heat_index=38.0,
            )

    def test_negative_entry_rate(self) -> None:
        with pytest.raises(ValueError):
            UploadRow(
                zone_id="zone-a",
                timestamp="2026-07-10T14:30:00Z",  # type: ignore[arg-type]
                crowd_density=50.0,
                heat_index=35.0,
                entry_rate=-5.0,
            )

    def test_empty_zone_id(self) -> None:
        with pytest.raises(ValueError):
            UploadRow(
                zone_id="",
                timestamp="2026-07-10T14:30:00Z",  # type: ignore[arg-type]
                crowd_density=50.0,
                heat_index=35.0,
            )

    def test_optional_fields_default_none(self) -> None:
        row = UploadRow(
            zone_id="zone-b",
            timestamp="2026-07-10T14:30:00Z",  # type: ignore[arg-type]
            crowd_density=40.0,
            heat_index=32.0,
        )
        assert row.current_occupancy is None
        assert row.capacity is None
        assert row.languages_present is None

    def test_invalid_timestamp(self) -> None:
        with pytest.raises(ValueError):
            UploadRow(
                zone_id="zone-a",
                timestamp="not-a-date",  # type: ignore[arg-type]
                crowd_density=50.0,
                heat_index=35.0,
            )

    def test_languages_present_as_list(self) -> None:
        row = UploadRow(
            zone_id="zone-a",
            timestamp="2026-07-10T14:30:00Z",  # type: ignore[arg-type]
            crowd_density=50.0,
            heat_index=35.0,
            languages_present=["en", "es", "ar"],
        )
        assert row.languages_present == ["en", "es", "ar"]


class TestUploadResult:
    """Test UploadResult model."""

    def test_success_result(self) -> None:
        result = UploadResult(
            success=True,
            filename="test.csv",
            rows_accepted=100,
            rows_rejected=2,
            message="Dataset loaded.",
        )
        assert result.success
        assert result.rows_accepted == 100

    def test_failure_with_errors(self) -> None:
        result = UploadResult(
            success=False,
            filename="bad.json",
            rows_rejected=5,
            errors=[
                UploadValidationError(
                    row=3,
                    field="crowd_density",
                    message="Value out of range",
                    value="150",
                ),
            ],
            message="Validation failed.",
        )
        assert not result.success
        assert len(result.errors) == 1
        assert result.errors[0].row == 3


class TestCSVParsing:
    """Test CSV parsing edge cases."""

    def test_empty_csv(self) -> None:
        from app.routers.upload import _parse_csv

        rows, errors = _parse_csv("")
        assert len(rows) == 0

    def test_header_only_csv(self) -> None:
        from app.routers.upload import _parse_csv

        rows, errors = _parse_csv("zone_id,timestamp,crowd_density,heat_index\n")
        assert len(rows) == 0
        assert len(errors) == 0

    def test_missing_required_columns(self) -> None:
        from app.routers.upload import _parse_csv

        rows, errors = _parse_csv("zone_id,some_other_field\nzone-a,123\n")
        assert len(errors) > 0
        assert "Missing required columns" in errors[0].message

    def test_non_numeric_density(self) -> None:
        from app.routers.upload import _parse_csv

        csv_text = "zone_id,timestamp,crowd_density,heat_index\nzone-a,2026-07-10T14:00:00Z,not_a_number,38.0\n"
        rows, errors = _parse_csv(csv_text)
        assert len(errors) > 0


class TestJSONParsing:
    """Test JSON parsing edge cases."""

    def test_valid_json_array(self) -> None:
        from app.routers.upload import _parse_json

        data = json.dumps(
            [{"zone_id": "zone-a", "timestamp": "2026-07-10T14:00:00Z", "crowd_density": 50.0, "heat_index": 35.0}]
        )
        rows, errors = _parse_json(data)
        assert len(rows) == 1
        assert len(errors) == 0

    def test_invalid_json(self) -> None:
        from app.routers.upload import _parse_json

        rows, errors = _parse_json("{invalid json")
        assert len(errors) > 0
        assert "Invalid JSON" in errors[0].message

    def test_single_object_json(self) -> None:
        from app.routers.upload import _parse_json

        data = json.dumps(
            {"zone_id": "zone-a", "timestamp": "2026-07-10T14:00:00Z", "crowd_density": 50.0, "heat_index": 35.0}
        )
        rows, errors = _parse_json(data)
        assert len(rows) == 1

    def test_non_object_array_items(self) -> None:
        from app.routers.upload import _parse_json

        data = json.dumps([1, 2, 3])
        rows, errors = _parse_json(data)
        assert len(errors) == 3
