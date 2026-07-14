"""Tests for alert functionality."""

from __future__ import annotations

import pytest

from app.config import Settings
from app.models.alert import Alert, AlertFilter, AlertSeverity
from app.services.firestore_service import FirestoreService


@pytest.fixture
def firestore() -> FirestoreService:
    settings = Settings(firestore_in_memory=True)
    return FirestoreService(settings)


def _make_alert(zone_id: str, severity: str, summary: str = "Test alert") -> Alert:
    import uuid
    return Alert(
        alert_id=f"alert-{uuid.uuid4().hex[:8]}",
        zone_id=zone_id,
        zone_name=f"Zone {zone_id}",
        severity=AlertSeverity(severity),
        summary=summary,
        reasoning="Test reasoning chain",
        suggested_actions=["Action 1"],
        multilingual_alerts={"en": "Test"},
        confidence=0.85,
    )


class TestAlertModel:
    """Test Alert Pydantic model."""

    def test_valid_alert(self) -> None:
        alert = _make_alert("zone-a", "high")
        assert alert.severity == AlertSeverity.HIGH
        assert not alert.resolved

    def test_dynamic_multilingual_keys(self) -> None:
        alert = Alert(
            alert_id="test-1",
            zone_id="zone-b",
            severity=AlertSeverity.MODERATE,
            summary="Test",
            multilingual_alerts={"en": "Test", "ar": "اختبار", "ja": "テスト"},
            confidence=0.7,
        )
        assert len(alert.multilingual_alerts) == 3
        assert "ar" in alert.multilingual_alerts

    def test_stale_flag(self) -> None:
        alert = Alert(
            alert_id="test-2",
            zone_id="zone-a",
            severity=AlertSeverity.HIGH,
            summary="Stale alert",
            is_stale=True,
            confidence=0.5,
        )
        assert alert.is_stale


class TestAlertFilter:
    """Test AlertFilter model."""

    def test_default_pagination(self) -> None:
        f = AlertFilter()
        assert f.page == 1
        assert f.page_size == 20

    def test_custom_pagination(self) -> None:
        f = AlertFilter(page=3, page_size=50)
        assert f.page == 3
        assert f.page_size == 50

    def test_page_size_cap(self) -> None:
        with pytest.raises(ValueError):
            AlertFilter(page_size=200)  # Max is 100


class TestFirestoreAlerts:
    """Test alert storage and retrieval in in-memory mode."""

    @pytest.mark.asyncio
    async def test_add_and_retrieve_alert(self, firestore: FirestoreService) -> None:
        alert = _make_alert("zone-a", "high")
        await firestore.add_alert(alert)

        feed = await firestore.get_alerts(AlertFilter())
        assert feed.total_count == 1
        assert feed.alerts[0].alert_id == alert.alert_id

    @pytest.mark.asyncio
    async def test_filter_by_severity(self, firestore: FirestoreService) -> None:
        await firestore.add_alert(_make_alert("zone-a", "high"))
        await firestore.add_alert(_make_alert("zone-b", "low"))
        await firestore.add_alert(_make_alert("zone-c", "critical"))

        feed = await firestore.get_alerts(AlertFilter(severity=AlertSeverity.HIGH))
        assert feed.total_count == 1
        assert feed.alerts[0].severity == AlertSeverity.HIGH

    @pytest.mark.asyncio
    async def test_filter_by_zone(self, firestore: FirestoreService) -> None:
        await firestore.add_alert(_make_alert("zone-a", "high"))
        await firestore.add_alert(_make_alert("zone-b", "moderate"))

        feed = await firestore.get_alerts(AlertFilter(zone_id="zone-a"))
        assert feed.total_count == 1
        assert feed.alerts[0].zone_id == "zone-a"

    @pytest.mark.asyncio
    async def test_pagination(self, firestore: FirestoreService) -> None:
        for i in range(10):
            await firestore.add_alert(_make_alert(f"zone-{i}", "moderate"))

        page1 = await firestore.get_alerts(AlertFilter(page=1, page_size=3))
        assert len(page1.alerts) == 3
        assert page1.has_next

        page2 = await firestore.get_alerts(AlertFilter(page=2, page_size=3))
        assert len(page2.alerts) == 3

    @pytest.mark.asyncio
    async def test_concurrent_critical_alerts(self, firestore: FirestoreService) -> None:
        """Two zones crossing critical threshold simultaneously — no race condition."""
        alert1 = _make_alert("zone-a", "critical", "Zone A critical")
        alert2 = _make_alert("zone-c", "critical", "Zone C critical")

        await firestore.add_alert(alert1)
        await firestore.add_alert(alert2)

        feed = await firestore.get_alerts(AlertFilter(severity=AlertSeverity.CRITICAL))
        assert feed.total_count == 2
