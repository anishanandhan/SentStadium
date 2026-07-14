"""Firestore service with in-memory fallback for local development."""

from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

import structlog

from app.config import Settings
from app.models.alert import Alert, AlertFeed, AlertFilter
from app.models.zone import ZoneData, ZoneDetail, ZoneHistory, ZoneTrend

logger = structlog.get_logger("app.services.firestore")


class FirestoreService:
    """Abstracts Firestore operations with an in-memory fallback.

    When ``settings.firestore_in_memory`` is True, all data lives in
    plain Python dicts — no cloud connection required. This makes local
    development and testing trivial.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._in_memory = settings.firestore_in_memory
        self._db: Any = None  # Firestore client when not in-memory

        # In-memory stores
        self._zones: dict[str, dict[str, Any]] = {}
        self._alerts: list[dict[str, Any]] = []
        self._zone_history: dict[str, list[dict[str, Any]]] = {}
        self._recommendations: dict[str, dict[str, Any]] = {}
        self._using_uploaded_data: bool = False
        self._uploaded_filename: str = ""

        if not self._in_memory:
            self._init_firestore(settings)

    # ------------------------------------------------------------------
    # Initialization
    # ------------------------------------------------------------------

    def _init_firestore(self, settings: Settings) -> None:
        """Initialize the Firestore client (real mode)."""
        try:
            import firebase_admin  # type: ignore[import-untyped]
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                if settings.firestore_emulator_host:
                    import os
                    os.environ["FIRESTORE_EMULATOR_HOST"] = settings.firestore_emulator_host
                    firebase_admin.initialize_app()
                else:
                    cred = credentials.ApplicationDefault()
                    firebase_admin.initialize_app(cred, {"projectId": settings.gcp_project})

            self._db = firestore.client()
            logger.info("firestore_connected", project=settings.gcp_project)
        except Exception:
            logger.warning("firestore_fallback_to_memory", reason="failed to connect")
            self._in_memory = True

    # ------------------------------------------------------------------
    # Zone Operations
    # ------------------------------------------------------------------

    async def seed_zones(self, zones: list[ZoneData]) -> None:
        """Seed initial zone data (only if store is empty)."""
        if self._in_memory:
            if not self._zones:
                for z in zones:
                    self._zones[z.zone_id] = z.model_dump(mode="json")
                    self._zone_history[z.zone_id] = []
                logger.info("zones_seeded_in_memory", count=len(zones))
        else:
            # Firestore: batch write
            batch = self._db.batch()
            zones_ref = self._db.collection("zones")
            for z in zones:
                doc_ref = zones_ref.document(z.zone_id)
                doc = doc_ref.get()
                if not doc.exists:
                    batch.set(doc_ref, z.model_dump(mode="json"))
            batch.commit()
            logger.info("zones_seeded_firestore", count=len(zones))

    async def get_all_zones(self) -> list[ZoneData]:
        """Return current state of all zones."""
        if self._in_memory:
            return [ZoneData.model_validate(z) for z in self._zones.values()]

        docs = self._db.collection("zones").stream()
        return [ZoneData.model_validate(doc.to_dict()) for doc in docs]

    async def get_zone(self, zone_id: str) -> ZoneData | None:
        """Return a single zone by ID."""
        if self._in_memory:
            data = self._zones.get(zone_id)
            return ZoneData.model_validate(data) if data else None

        doc = self._db.collection("zones").document(zone_id).get()
        return ZoneData.model_validate(doc.to_dict()) if doc.exists else None

    async def get_zone_detail(self, zone_id: str) -> ZoneDetail | None:
        """Return full zone detail including history and latest recommendation."""
        zone = await self.get_zone(zone_id)
        if zone is None:
            return None

        history = await self._get_zone_history(zone_id)
        rec = self._recommendations.get(zone_id)

        return ZoneDetail(
            zone=zone,
            history=history,
            latest_recommendation=rec,
        )

    async def update_zone(self, zone_id: str, data: dict[str, Any]) -> None:
        """Update a zone's current state and append to history."""
        now = datetime.now(UTC).isoformat()
        data["last_updated"] = now

        if self._in_memory:
            if zone_id in self._zones:
                self._zones[zone_id].update(data)
                # Append to history
                trend_point = {
                    "timestamp": now,
                    "crowd_density": data.get("crowd_density", 0),
                    "heat_index": data.get("heat_index", 0),
                    "entry_rate": data.get("entry_rate", 0),
                }
                history = self._zone_history.setdefault(zone_id, [])
                history.append(trend_point)
                # Keep last 60 data points (15 min at 15s intervals)
                if len(history) > 60:
                    self._zone_history[zone_id] = history[-60:]
        else:
            self._db.collection("zones").document(zone_id).update(data)

    async def replace_all_zones(self, zones: list[ZoneData]) -> None:
        """Replace all zone data (used after upload)."""
        if self._in_memory:
            self._zones.clear()
            self._zone_history.clear()
            for z in zones:
                self._zones[z.zone_id] = z.model_dump(mode="json")
                self._zone_history[z.zone_id] = []
        else:
            # Delete existing, write new
            batch = self._db.batch()
            zones_ref = self._db.collection("zones")
            for doc in zones_ref.stream():
                batch.delete(doc.reference)
            for z in zones:
                batch.set(zones_ref.document(z.zone_id), z.model_dump(mode="json"))
            batch.commit()

    async def _get_zone_history(self, zone_id: str) -> ZoneHistory:
        """Get trend history for a zone."""
        if self._in_memory:
            raw = self._zone_history.get(zone_id, [])
            trends = [ZoneTrend.model_validate(t) for t in raw]
            return ZoneHistory(zone_id=zone_id, trends=trends)

        # Firestore: query history subcollection
        docs = (
            self._db.collection("zones")
            .document(zone_id)
            .collection("history")
            .order_by("timestamp")
            .limit(60)
            .stream()
        )
        trends = [ZoneTrend.model_validate(doc.to_dict()) for doc in docs]
        return ZoneHistory(zone_id=zone_id, trends=trends)

    # ------------------------------------------------------------------
    # Alert Operations
    # ------------------------------------------------------------------

    async def add_alert(self, alert: Alert) -> None:
        """Store a new alert."""
        data = alert.model_dump(mode="json")
        if self._in_memory:
            self._alerts.insert(0, data)
            # Cap at 500 alerts in memory
            if len(self._alerts) > 500:
                self._alerts = self._alerts[:500]
        else:
            self._db.collection("alerts").document(alert.alert_id).set(data)

    async def get_alerts(self, filters: AlertFilter) -> AlertFeed:
        """Return paginated, filtered alerts."""
        if self._in_memory:
            filtered = list(self._alerts)

            # Apply filters
            if filters.severity:
                filtered = [a for a in filtered if a["severity"] == filters.severity]
            if filters.zone_id:
                filtered = [a for a in filtered if a["zone_id"] == filters.zone_id]
            if filters.start_time:
                start_iso = filters.start_time.isoformat()
                filtered = [a for a in filtered if a["created_at"] >= start_iso]
            if filters.end_time:
                end_iso = filters.end_time.isoformat()
                filtered = [a for a in filtered if a["created_at"] <= end_iso]

            total = len(filtered)
            start = (filters.page - 1) * filters.page_size
            end = start + filters.page_size
            page_data = filtered[start:end]

            return AlertFeed(
                alerts=[Alert.model_validate(a) for a in page_data],
                total_count=total,
                page=filters.page,
                page_size=filters.page_size,
                has_next=end < total,
            )

        # Firestore query
        query = self._db.collection("alerts").order_by("created_at", direction="DESCENDING")
        if filters.severity:
            query = query.where("severity", "==", filters.severity)
        if filters.zone_id:
            query = query.where("zone_id", "==", filters.zone_id)

        all_docs = list(query.stream())
        total = len(all_docs)
        start = (filters.page - 1) * filters.page_size
        end = start + filters.page_size
        page_docs = all_docs[start:end]

        return AlertFeed(
            alerts=[Alert.model_validate(doc.to_dict()) for doc in page_docs],
            total_count=total,
            page=filters.page,
            page_size=filters.page_size,
            has_next=end < total,
        )

    # ------------------------------------------------------------------
    # Recommendation Cache
    # ------------------------------------------------------------------

    async def store_recommendation(self, zone_id: str, recommendation: dict[str, Any]) -> None:
        """Cache the latest AI recommendation for a zone."""
        self._recommendations[zone_id] = deepcopy(recommendation)
        if not self._in_memory:
            self._db.collection("recommendations").document(zone_id).set(recommendation)

    async def get_recommendation(self, zone_id: str) -> dict[str, Any] | None:
        """Retrieve cached recommendation for a zone."""
        if self._in_memory:
            return deepcopy(self._recommendations.get(zone_id))

        doc = self._db.collection("recommendations").document(zone_id).get()
        return doc.to_dict() if doc.exists else None

    # ------------------------------------------------------------------
    # Upload State
    # ------------------------------------------------------------------

    @property
    def using_uploaded_data(self) -> bool:
        return self._using_uploaded_data

    @property
    def uploaded_filename(self) -> str:
        return self._uploaded_filename

    def set_upload_state(self, active: bool, filename: str = "") -> None:
        self._using_uploaded_data = active
        self._uploaded_filename = filename

    def generate_alert_id(self) -> str:
        """Generate a unique alert ID."""
        return f"alert-{uuid.uuid4().hex[:12]}"
