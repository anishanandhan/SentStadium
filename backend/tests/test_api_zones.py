from fastapi.testclient import TestClient


def test_get_zones(client: TestClient) -> None:
    response = client.get("/api/zones")
    assert response.status_code == 200
    zones = response.json()
    assert isinstance(zones, list)
    assert len(zones) == 6  # Synthetic generator seeds 6 zones
    # Verify zone fields
    zone = zones[0]
    assert "zone_id" in zone
    assert "crowd_density" in zone
    assert "risk_level" in zone


def test_get_zone_detail(client: TestClient) -> None:
    # Fetch all zones to get a valid ID
    response = client.get("/api/zones")
    zones = response.json()
    zone_id = zones[0]["zone_id"]

    # Fetch detail
    response = client.get(f"/api/zones/{zone_id}")
    assert response.status_code == 200
    detail = response.json()
    assert detail["zone"]["zone_id"] == zone_id
    assert "history" in detail
    assert isinstance(detail["history"], dict)
    assert "trends" in detail["history"]


def test_get_invalid_zone(client: TestClient) -> None:
    response = client.get("/api/zones/invalid-zone-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Zone 'invalid-zone-id' not found"
