from fastapi.testclient import TestClient
from shotmill.app import app


def test_health_endpoint_reports_backend_ready() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "shotmill-backend"}


def test_root_exposes_product_identity() -> None:
    with TestClient(app) as client:
        response = client.get("/")

    assert response.status_code == 200
    assert response.json()["name"] == "ShotMill"
