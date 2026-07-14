from fastapi.testclient import TestClient


def test_run_reasoning_all_zones(client: TestClient) -> None:
    response = client.post("/api/reason")
    assert response.status_code == 200
    output = response.json()
    assert "zone_id" in output
    assert "severity" in output
    assert "confidence" in output
    assert "recommendation" in output
    assert "reasoning" in output
    assert "suggested_actions" in output
    assert "multilingual_alerts" in output


def test_run_reasoning_specific_zone(client: TestClient) -> None:
    response = client.post("/api/reason/zone-a")
    assert response.status_code == 200
    output = response.json()
    assert output["zone_id"] == "zone-a"
    assert "severity" in output


def test_run_reasoning_invalid_zone(client: TestClient) -> None:
    client.post("/api/reason/invalid-zone-id")
    # This might return 422 because of regex validation `^zone-[a-z0-9-]+$`
    # Or 404 if it bypassed it and failed at firestore.
    # Actually 'invalid-zone-id' doesn't match `^zone-[a-z0-9-]+$`? Wait, it DOES match regex because it has dashes and lowercase.
    # So it hits 404. Let's use a non-matching regex to test 422.

    response_404 = client.post("/api/reason/zone-invalid")
    assert response_404.status_code == 404

    response_422 = client.post("/api/reason/INVALID_ZONE_ID")
    assert response_422.status_code == 422


def test_run_reasoning_query_param(client: TestClient) -> None:
    response = client.post("/api/reason?zone_id=zone-a")
    assert response.status_code == 200
    output = response.json()
    assert output["zone_id"] == "zone-a"
