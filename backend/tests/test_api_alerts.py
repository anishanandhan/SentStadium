from fastapi.testclient import TestClient


def test_get_alerts(client: TestClient) -> None:
    response = client.get("/api/alerts")
    assert response.status_code == 200
    feed = response.json()
    assert "alerts" in feed
    assert "total_count" in feed
    assert "has_next" in feed

def test_get_alerts_pagination(client: TestClient) -> None:
    response = client.get("/api/alerts?page=1&page_size=2")
    assert response.status_code == 200
    feed = response.json()
    assert len(feed["alerts"]) <= 2

def test_get_alerts_filtering(client: TestClient) -> None:
    response = client.get("/api/alerts?severity=high&zone_id=zone-a")
    assert response.status_code == 200
    feed = response.json()

    # We might not have any seeded alerts matching this exactly right at startup,
    # but the API should return 200 and an empty list or matching list.
    assert isinstance(feed["alerts"], list)
    if feed["alerts"]:
        assert feed["alerts"][0]["severity"] == "high"
        assert feed["alerts"][0]["zone_id"] == "zone-a"
