def test_health(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "shotmill-backend"}


def test_root(client) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"name": "ShotMill", "version": "0.3"}
