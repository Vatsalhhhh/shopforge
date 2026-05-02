"""
Health and readiness check endpoints.
GET /api/v1/health        — liveness probe (always returns 200 if process is up)
GET /api/v1/health/ready  — readiness probe (checks DB + Redis connectivity)
"""
import time
from typing import Any

import redis.asyncio as aioredis
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.db.database import engine
from app.utils.redis_client import get_redis

router = APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get("/health", summary="Liveness probe")
async def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "uptime_seconds": round(time.time() - START_TIME, 2),
    }


@router.get("/health/ready", summary="Readiness probe")
async def readiness_check() -> JSONResponse:
    """
    Checks that both PostgreSQL and Redis are reachable.
    Returns 200 if all healthy, 503 if any dependency is down.
    """
    checks: dict[str, Any] = {}
    healthy = True

    # PostgreSQL check
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = {"status": "ok"}
    except Exception as exc:
        checks["database"] = {"status": "error", "detail": str(exc)}
        healthy = False

    # Redis check
    try:
        redis_client = get_redis()
        await redis_client.ping()
        checks["redis"] = {"status": "ok"}
    except Exception as exc:
        checks["redis"] = {"status": "error", "detail": str(exc)}
        healthy = False

    http_status = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=http_status,
        content={
            "status": "ready" if healthy else "degraded",
            "checks": checks,
        },
    )
