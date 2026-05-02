"""Health & readiness endpoints."""


def test_health_ok(api):
    r = api.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["app"] == "ShopForge"
    assert "uptime_seconds" in body


def test_readiness_ok(api):
    r = api.get("/health/ready")
    assert r.status_code == 200


def test_api_has_46_routes(api):
    r = api.get("http://localhost:8000/api/openapi.json")
    assert r.status_code == 200
    routes = list(r.json()["paths"].keys())
    assert len(routes) >= 40, f"Expected ≥40 routes, got {len(routes)}"


def test_docs_accessible(api):
    r = api.get("http://localhost:8000/api/docs")
    assert r.status_code == 200
