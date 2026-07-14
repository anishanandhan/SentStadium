"""Reasoning endpoint — POST /api/reason.

Assembles zone signals, calls Gemini, validates response, stores result.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Annotated

import structlog
from fastapi import APIRouter, HTTPException, Path, Request

from app.models.alert import Alert, AlertSeverity
from app.models.reasoning import NeighborZoneSummary, ReasoningInput, ReasoningOutput
from app.services.gemini_service import GeminiService
from app.services.synthetic_data import SyntheticDataGenerator

if TYPE_CHECKING:
    from app.services.firestore_service import FirestoreService

logger = structlog.get_logger("app.routers.reasoning")

router = APIRouter()

# Severity ordering for selecting the highest-priority result.
_SEVERITY_RANK: dict[str, int] = {"critical": 4, "high": 3, "moderate": 2, "low": 1}

# Severity levels that warrant creating an alert.
_ALERT_SEVERITIES: frozenset[str] = frozenset({"moderate", "high", "critical"})


@router.post("/reason", response_model=ReasoningOutput)
async def run_reasoning(request: Request, zone_id: str | None = None) -> ReasoningOutput:
    """Run AI reasoning for a specific zone or all zones.

    Assembles current zone signals + neighboring zone data + history,
    calls Gemini, validates the response, stores the recommendation
    and creates an alert if severity warrants it.
    """
    fs: FirestoreService = request.app.state.firestore
    settings = request.app.state.settings

    # Initialize Gemini service (lazy, per-request for now)
    gemini = GeminiService(settings)

    if zone_id:
        return await _reason_for_zone(zone_id, fs, gemini)

    # Reason for all zones
    zones = await fs.get_all_zones()
    if not zones:
        raise HTTPException(status_code=404, detail="No zones available")

    # Process all zones and return the highest-severity result
    results: list[ReasoningOutput] = []
    for z in zones:
        try:
            result = await _reason_for_zone(z.zone_id, fs, gemini)
            results.append(result)
        except Exception as exc:
            logger.exception("reasoning_failed_for_zone", zone_id=z.zone_id, error=str(exc))

    if not results:
        raise HTTPException(status_code=500, detail="Reasoning failed for all zones")

    # Return the highest severity result
    results.sort(key=lambda r: _SEVERITY_RANK.get(r.severity, 0), reverse=True)
    return results[0]


@router.post("/reason/{zone_id}", response_model=ReasoningOutput)
async def run_reasoning_for_zone(
    request: Request,
    zone_id: Annotated[str, Path(pattern=r"^zone-[a-z0-9-]+$")],
) -> ReasoningOutput:
    """Run AI reasoning for a specific zone."""
    fs: FirestoreService = request.app.state.firestore
    settings = request.app.state.settings
    gemini = GeminiService(settings)
    return await _reason_for_zone(zone_id, fs, gemini)


async def _reason_for_zone(
    zone_id: str,
    fs: FirestoreService,
    gemini: GeminiService,
) -> ReasoningOutput:
    """Internal: assemble input, call reasoning, store result, create alert."""
    # Get zone data
    zone = await fs.get_zone(zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")

    # Get history for trend data
    history = await fs._get_zone_history(zone_id)
    density_trend = [t.crowd_density for t in history.trends[-7:]]
    heat_trend = [t.heat_index for t in history.trends[-7:]]

    # Get neighboring zones for cross-zone reasoning
    all_zones = await fs.get_all_zones()
    neighbors = [
        NeighborZoneSummary(
            zone_id=z.zone_id,
            zone_name=z.zone_name,
            crowd_density=z.crowd_density,
            heat_index=z.heat_index,
            has_shade=z.has_shade,
            has_hydration_point=z.has_hydration_point,
            entry_rate=z.entry_rate,
        )
        for z in all_zones
        if z.zone_id != zone_id
    ]

    # Historical incidents
    incidents = SyntheticDataGenerator.get_historical_incidents(zone_id)

    # Assemble reasoning input
    reasoning_input = ReasoningInput(
        zone_id=zone.zone_id,
        zone_name=zone.zone_name,
        crowd_density=zone.crowd_density,
        crowd_density_trend=density_trend,
        heat_index=zone.heat_index,
        heat_index_trend=heat_trend,
        entry_rate=zone.entry_rate,
        capacity=zone.capacity,
        current_occupancy=zone.current_occupancy,
        has_shade=zone.has_shade,
        has_hydration_point=zone.has_hydration_point,
        languages_present=zone.languages_present,
        time_to_event="30 min to kickoff",  # Would come from event scheduler in prod
        neighboring_zones=neighbors,
        historical_incidents=incidents,
    )

    # Call Gemini reasoning
    log = logger.bind(zone_id=zone_id)
    log.info("reasoning_started", density=zone.crowd_density, heat=zone.heat_index)

    result = await gemini.reason(reasoning_input)

    log.info(
        "reasoning_completed",
        severity=result.severity,
        confidence=result.confidence,
    )

    # Store the recommendation
    await fs.store_recommendation(zone_id, result.model_dump(mode="json"))

    # Create alert if severity is moderate or higher
    if result.severity in _ALERT_SEVERITIES:
        alert = Alert(
            alert_id=fs.generate_alert_id(),
            zone_id=zone_id,
            zone_name=zone.zone_name,
            severity=AlertSeverity(result.severity),
            summary=result.recommendation,
            reasoning=result.reasoning,
            suggested_actions=result.suggested_actions,
            multilingual_alerts=result.multilingual_alerts,
            confidence=result.confidence,
        )
        await fs.add_alert(alert)
        log.info("alert_created", alert_id=alert.alert_id, severity=alert.severity)

    return result
