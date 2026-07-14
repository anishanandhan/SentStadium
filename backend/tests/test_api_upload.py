import io

from fastapi.testclient import TestClient


def test_reset_data(client: TestClient) -> None:
    response = client.post("/api/data/reset")
    assert response.status_code == 200
    res = response.json()
    assert res["success"]
    assert res["rows_accepted"] > 0
    assert res["rows_rejected"] == 0

def test_upload_valid_csv(client: TestClient) -> None:
    csv_content = """zone_id,timestamp,crowd_density,heat_index,entry_rate,current_occupancy,capacity,languages_present
zone-a,2026-07-04T12:00:00Z,75.5,35.2,120,45000,60000,"en,es"
zone-b,2026-07-04T12:00:00Z,40.0,30.0,50,24000,60000,"en"
"""
    file_obj = io.BytesIO(csv_content.encode("utf-8"))
    file_obj.name = "test.csv"

    response = client.post(
        "/api/data/upload",
        files={"file": ("test.csv", file_obj, "text/csv")}
    )

    assert response.status_code == 200
    res = response.json()
    assert res["success"]
    assert res["rows_accepted"] == 2
    assert res["rows_rejected"] == 0

def test_upload_invalid_mime(client: TestClient) -> None:
    file_obj = io.BytesIO(b"random bytes")
    response = client.post(
        "/api/data/upload",
        files={"file": ("test.txt", file_obj, "text/plain")}
    )

    assert response.status_code == 200
    res = response.json()
    assert not res["success"]
