"""Zone endpoints — GET /api/zones and GET /api/zones/{zone_id}."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.models.zone import ZoneData, ZoneDetail
from app.services.firestore_service import FirestoreService

router = APIRouter()


@router.get("/zones", response_model=list[ZoneData])
async def get_all_zones(request: Request) -> list[ZoneData]:
    """Return current state of all stadium zones."""
    fs: FirestoreService = request.app.state.firestore
    return await fs.get_all_zones()


@router.get("/zones/{zone_id}", response_model=ZoneDetail)
async def get_zone_detail(zone_id: str, request: Request) -> ZoneDetail:
    """Return full detail for a single zone including history and recommendation."""
    fs: FirestoreService = request.app.state.firestore
    detail = await fs.get_zone_detail(zone_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")
    return detail
