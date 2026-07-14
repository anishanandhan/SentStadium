from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    # We use TestClient with the main app
    with TestClient(app) as test_client:
        yield test_client
