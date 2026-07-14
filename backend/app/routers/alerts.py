"""Alert feed endpoint — GET /api/alerts with pagination and filtering."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Request

from app.models.alert import AlertFeed, AlertFilter, AlertSeverity

if TYPE_CHECKING:
    from datetime import datetime

    from app.services.firestore_service import FirestoreService

router = APIRouter()


@router.get("/alerts", response_model=AlertFeed)
async def get_alerts(
    request: Request,
    severity: AlertSeverity | None = None,
    zone_id: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    page: int = 1,
    page_size: int = 20,
) -> AlertFeed:
    """Return paginated, filterable alert feed — reverse chronological."""
    fs: FirestoreService = request.app.state.firestore
    filters = AlertFilter(
        severity=severity,
        zone_id=zone_id,
        start_time=start_time,
        end_time=end_time,
        page=max(1, page),
        page_size=min(100, max(2, page_size)),
    )
    return await fs.get_alerts(filters)
