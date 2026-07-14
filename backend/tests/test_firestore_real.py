from collections.abc import Generator
from unittest.mock import MagicMock, patch

import pytest

from app.config import Settings
from app.models.alert import Alert, AlertFilter, AlertSeverity
from app.models.zone import RiskLevel, ZoneData
from app.services.firestore_service import FirestoreService


@pytest.fixture
def mock_firestore() -> Generator[MagicMock, None, None]:
    with (
        patch("firebase_admin.initialize_app"),
        patch("firebase_admin._apps", new={"DEFAULT": True}),
        patch("firebase_admin.credentials.ApplicationDefault"),
        patch("firebase_admin.firestore.client") as mock_client,
    ):
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        yield mock_db


def test_firestore_real_init(mock_firestore: MagicMock) -> None:
    settings = Settings(firestore_in_memory=False, gcp_project="test-project")
    fs = FirestoreService(settings)
    assert not fs._in_memory
    assert fs._db == mock_firestore


@pytest.mark.asyncio
async def test_firestore_real_seed_zones(mock_firestore: MagicMock) -> None:
    settings = Settings(firestore_in_memory=False)
    fs = FirestoreService(settings)

    mock_batch = MagicMock()
    mock_firestore.batch.return_value = mock_batch

    mock_doc = MagicMock()
    mock_doc.exists = False
    mock_doc_ref = MagicMock()
    mock_doc_ref.get.return_value = mock_doc
    mock_firestore.collection().document.return_value = mock_doc_ref

    zone = ZoneData(
        zone_id="zone-test",
        zone_name="Test",
        crowd_density=10.0,
        heat_index=20.0,
        entry_rate=5.0,
        risk_level=RiskLevel.LOW,
        capacity=1000,
        current_occupancy=100,
        has_shade=True,
        has_hydration_point=True,
    )

    await fs.seed_zones([zone])
    mock_batch.set.assert_called_once()
    mock_batch.commit.assert_called_once()


@pytest.mark.asyncio
async def test_firestore_real_get_all_zones(mock_firestore: MagicMock) -> None:
    settings = Settings(firestore_in_memory=False)
    fs = FirestoreService(settings)

    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {
        "zone_id": "zone-1",
        "zone_name": "Test",
        "crowd_density": 10.0,
        "heat_index": 20.0,
        "entry_rate": 5.0,
        "risk_level": "low",
        "capacity": 1000,
        "current_occupancy": 100,
        "has_shade": True,
        "has_hydration_point": True,
        "languages_present": ["en"],
        "last_updated": "2026-07-11T12:00:00Z",
    }
    mock_firestore.collection().stream.return_value = [mock_doc]

    zones = await fs.get_all_zones()
    assert len(zones) == 1
    assert zones[0].zone_id == "zone-1"


@pytest.mark.asyncio
async def test_firestore_real_add_alert(mock_firestore: MagicMock) -> None:
    settings = Settings(firestore_in_memory=False)
    fs = FirestoreService(settings)

    alert = Alert(
        alert_id="test-alert",
        zone_id="zone-1",
        zone_name="Test",
        severity=AlertSeverity.HIGH,
        summary="Test",
        reasoning="Test",
        confidence=0.9,
    )

    await fs.add_alert(alert)
    mock_firestore.collection().document().set.assert_called_once()


@pytest.mark.asyncio
async def test_firestore_real_get_alerts(mock_firestore: MagicMock) -> None:
    settings = Settings(firestore_in_memory=False)
    fs = FirestoreService(settings)

    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {
        "alert_id": "test-alert",
        "zone_id": "zone-1",
        "zone_name": "Test",
        "severity": "high",
        "summary": "Test",
        "reasoning": "Test",
        "confidence": 0.9,
        "suggested_actions": [],
        "multilingual_alerts": {},
        "created_at": "2026-07-11T12:00:00Z",
        "resolved": False,
        "is_stale": False,
    }

    # Mock chain: collection().order_by().where().where().stream()
    mock_query = MagicMock()
    mock_query.stream.return_value = [mock_doc]
    mock_query.where.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_firestore.collection.return_value = mock_query

    feed = await fs.get_alerts(AlertFilter(severity=AlertSeverity.HIGH, zone_id="zone-1"))
    assert feed.total_count == 1
    assert feed.alerts[0].alert_id == "test-alert"
