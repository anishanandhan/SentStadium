"""Data upload and reset endpoints.

POST /api/data/upload — accepts CSV/JSON, validates, replaces active dataset
POST /api/data/reset — reverts to synthetic data
"""

from __future__ import annotations

import csv
import io
import json
from contextlib import suppress

import structlog
from fastapi import APIRouter, HTTPException, Request, UploadFile

from app.models.upload import UploadResult, UploadRow, UploadValidationError
from app.models.zone import RiskLevel, ZoneData
from app.services.synthetic_data import SyntheticDataGenerator

logger = structlog.get_logger("app.routers.upload")

router = APIRouter()

# Allowed MIME types
ALLOWED_MIME_TYPES = {
    "text/csv",
    "application/json",
    "application/vnd.ms-excel",  # some systems report CSV as this
    "text/plain",  # fallback for CSV
}

EXPECTED_COLUMNS = {"zone_id", "timestamp", "crowd_density", "heat_index"}


@router.post("/data/upload", response_model=UploadResult)
async def upload_data(request: Request, file: UploadFile) -> UploadResult:
    """Upload a CSV or JSON dataset to replace active zone data.

    Validates schema per-row, returns detailed inline errors for malformed data.
    """
    settings = request.app.state.settings
    fs = request.app.state.firestore

    # --- Validate MIME type ---
    content_type = file.content_type or ""
    filename = file.filename or "unknown"

    if content_type not in ALLOWED_MIME_TYPES and not filename.endswith((".csv", ".json")):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {content_type}. Expected CSV or JSON.",
        )

    # --- Read and size-check ---
    content = await file.read()
    if len(content) == 0:
        return UploadResult(
            success=False,
            filename=filename,
            message="File is empty.",
            errors=[UploadValidationError(row=0, field="file", message="File is empty")],
        )

    if len(content) > settings.max_upload_size_bytes:
        size_mb = settings.max_upload_size_bytes / (1024 * 1024)
        return UploadResult(
            success=False,
            filename=filename,
            message=f"File exceeds maximum size of {size_mb:.0f} MB.",
            errors=[UploadValidationError(row=0, field="file", message=f"File size exceeds {size_mb:.0f} MB limit")],
        )

    # --- Parse rows ---
    text = content.decode("utf-8", errors="replace")
    is_json = filename.endswith(".json") or content_type == "application/json"

    rows: list[dict[str, object]] = []
    errors: list[UploadValidationError] = []

    if is_json:
        rows, errors = _parse_json(text)
    else:
        rows, errors = _parse_csv(text)

    if not rows and errors:
        return UploadResult(
            success=False,
            filename=filename,
            rows_rejected=len(errors),
            errors=errors[:50],  # Cap error list
            message="No valid rows found in uploaded file.",
        )

    # --- Validate each row against UploadRow schema ---
    valid_rows: list[UploadRow] = []
    for i, raw_row in enumerate(rows, start=1):
        try:
            validated = UploadRow.model_validate(raw_row)
            valid_rows.append(validated)
        except Exception as exc:
            errors.append(
                UploadValidationError(
                    row=i,
                    field="row",
                    message=str(exc),
                    value=str(raw_row)[:200],
                )
            )

    if not valid_rows:
        return UploadResult(
            success=False,
            filename=filename,
            rows_rejected=len(errors),
            errors=errors[:50],
            message="All rows failed validation.",
        )

    # --- Check row count limit ---
    if len(valid_rows) > settings.max_upload_rows:
        return UploadResult(
            success=False,
            filename=filename,
            message=f"Dataset exceeds maximum of {settings.max_upload_rows:,} rows.",
            errors=[UploadValidationError(row=0, field="file", message="Too many rows")],
        )

    # --- Convert to ZoneData and store ---
    zones = _rows_to_zones(valid_rows)
    await fs.replace_all_zones(zones)
    fs.set_upload_state(active=True, filename=filename)

    logger.info(
        "dataset_uploaded",
        filename=filename,
        accepted=len(valid_rows),
        rejected=len(errors),
        zones=len(zones),
    )

    return UploadResult(
        success=True,
        filename=filename,
        rows_accepted=len(valid_rows),
        rows_rejected=len(errors),
        errors=errors[:50],
        message=f"Dataset loaded: {len(zones)} zones from {len(valid_rows)} rows.",
    )


@router.post("/data/reset", response_model=UploadResult)
async def reset_data(request: Request) -> UploadResult:
    """Revert to synthetic/demo data."""
    fs = request.app.state.firestore
    generator = SyntheticDataGenerator()
    zones = generator.generate_zones()
    await fs.replace_all_zones(zones)
    fs.set_upload_state(active=False)

    logger.info("dataset_reset_to_synthetic")

    return UploadResult(
        success=True,
        filename="",
        rows_accepted=len(zones),
        message="Reset to synthetic data.",
    )


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _parse_csv(text: str) -> tuple[list[dict[str, object]], list[UploadValidationError]]:
    """Parse CSV text into row dicts, returning any parse errors."""
    rows: list[dict[str, object]] = []
    errors: list[UploadValidationError] = []

    try:
        reader = csv.DictReader(io.StringIO(text))
        headers = set(reader.fieldnames or [])

        # Check required columns
        missing = EXPECTED_COLUMNS - headers
        if missing:
            errors.append(
                UploadValidationError(
                    row=0,
                    field="header",
                    message=f"Missing required columns: {', '.join(sorted(missing))}",
                )
            )
            return rows, errors

        for i, row in enumerate(reader, start=1):
            # Convert numeric fields
            parsed: dict[str, object] = dict(row)
            for numeric_field in ("crowd_density", "heat_index", "entry_rate"):
                if numeric_field in parsed and parsed[numeric_field]:
                    try:
                        parsed[numeric_field] = float(str(parsed[numeric_field]))
                    except ValueError:
                        errors.append(
                            UploadValidationError(
                                row=i,
                                field=numeric_field,
                                message=f"Cannot convert '{parsed[numeric_field]}' to number",
                                value=str(parsed[numeric_field]),
                            )
                        )
                        continue

            for int_field in ("current_occupancy", "capacity"):
                if int_field in parsed and parsed[int_field]:
                    with suppress(ValueError):  # These are optional fields
                        parsed[int_field] = int(str(parsed[int_field]))

            rows.append(parsed)

    except csv.Error as exc:
        errors.append(
            UploadValidationError(row=0, field="file", message=f"CSV parse error: {exc}")
        )

    return rows, errors


def _parse_json(text: str) -> tuple[list[dict[str, object]], list[UploadValidationError]]:
    """Parse JSON text (array of objects) into row dicts."""
    rows: list[dict[str, object]] = []
    errors: list[UploadValidationError] = []

    try:
        data = json.loads(text)
        if isinstance(data, list):
            for i, item in enumerate(data):
                if isinstance(item, dict):
                    rows.append(item)
                else:
                    errors.append(
                        UploadValidationError(
                            row=i, field="row", message="Expected object, got non-object"
                        )
                    )
        elif isinstance(data, dict):
            # Single object — wrap in list
            rows.append(data)
        else:
            errors.append(
                UploadValidationError(
                    row=0, field="file", message="JSON must be an array of objects or a single object"
                )
            )
    except json.JSONDecodeError as exc:
        errors.append(
            UploadValidationError(row=0, field="file", message=f"Invalid JSON: {exc}")
        )

    return rows, errors


def _rows_to_zones(rows: list[UploadRow]) -> list[ZoneData]:
    """Aggregate uploaded rows into ZoneData objects.

    Groups by zone_id, uses the latest row per zone for current state.
    """
    zone_map: dict[str, UploadRow] = {}
    for row in rows:
        existing = zone_map.get(row.zone_id)
        if existing is None or row.timestamp > existing.timestamp:
            zone_map[row.zone_id] = row

    zones: list[ZoneData] = []
    for zid, row in zone_map.items():
        density = row.crowd_density
        heat = row.heat_index

        # Compute risk level
        if density > 80 and heat > 38:
            risk = RiskLevel.CRITICAL
        elif density > 80 or (density > 50 and heat > 38):
            risk = RiskLevel.HIGH
        elif density > 50 or heat > 34:
            risk = RiskLevel.MODERATE
        else:
            risk = RiskLevel.LOW

        cap = row.capacity or 5000
        occ = row.current_occupancy or int(cap * density / 100)

        zones.append(
            ZoneData(
                zone_id=zid,
                zone_name=zid.replace("-", " ").title(),
                crowd_density=density,
                heat_index=heat,
                entry_rate=row.entry_rate,
                risk_level=risk,
                capacity=cap,
                current_occupancy=occ,
                has_shade=False,
                has_hydration_point=False,
                languages_present=row.languages_present or ["en"],
                last_updated=row.timestamp,
            )
        )

    return zones
