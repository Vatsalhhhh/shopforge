"""Health endpoint tests — run without database dependency."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_returns_ok():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "uptime_seconds" in data


@pytest.mark.asyncio
async def test_health_ready_returns_json():
    """Ready endpoint should return JSON even when DB/Redis are unavailable in test."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health/ready")
    # 200 (healthy) or 503 (DB/Redis unavailable in CI) — both are valid responses
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert "checks" in data
