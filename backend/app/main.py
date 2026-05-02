"""
FastAPI application factory.
All configuration, middleware, routers, and lifespan events are wired here.
"""
import uuid
from contextlib import asynccontextmanager
from typing import Any

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.vendor.auth import router as vendor_auth_router
from app.api.v1.vendor.profile import router as vendor_profile_router
from app.api.v1.vendor.dashboard import router as vendor_dashboard_router
from app.api.v1.vendor.products import router as vendor_products_router
from app.api.v1.vendor.orders import router as vendor_orders_router
from app.api.v1.vendor.payouts import router as vendor_payouts_router
from app.api.v1.admin_vendors import router as admin_vendors_router
from app.core.config import settings
from app.core.rate_limit import limiter
from app.utils.logging import configure_logging
from app.utils.redis_client import close_redis, get_redis

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    configure_logging()
    logger.info("Starting up", app=settings.app_name, env=settings.app_env)

    # Warm up Redis connection pool
    try:
        await get_redis().ping()
        logger.info("Redis connected")
    except Exception as exc:
        logger.warning("Redis unavailable at startup", error=str(exc))

    yield  # ← application runs here

    logger.info("Shutting down")
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Production-ready e-commerce platform API",
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate limiter — exception handler returns 429 when a limit is hit
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Request ID middleware — every request gets a unique trace ID
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    # ── Global exception handler ──────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "Unhandled exception",
            path=request.url.path,
            method=request.method,
            error=str(exc),
            exc_info=True,
        )
        # Never expose internal details in production
        detail = str(exc) if settings.debug else "Internal server error"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": detail},
        )

    # ── Routers ───────────────────────────────────────────────────
    API_PREFIX = "/api/v1"

    app.include_router(health_router, prefix=API_PREFIX)
    app.include_router(auth_router,  prefix=API_PREFIX)

    # ── Vendor portal ─────────────────────────────────────────────
    app.include_router(vendor_auth_router,      prefix=API_PREFIX)
    app.include_router(vendor_profile_router,   prefix=API_PREFIX)
    app.include_router(vendor_dashboard_router, prefix=API_PREFIX)
    app.include_router(vendor_products_router,  prefix=API_PREFIX)
    app.include_router(vendor_orders_router,    prefix=API_PREFIX)
    app.include_router(vendor_payouts_router,   prefix=API_PREFIX)
    app.include_router(admin_vendors_router,    prefix=API_PREFIX)

    # Placeholder stubs for routers built in later phases
    # They will be uncommented as each phase completes:
    # app.include_router(auth_router,       prefix=f"{API_PREFIX}/auth",       tags=["Auth"])
    # app.include_router(users_router,      prefix=f"{API_PREFIX}/users",      tags=["Users"])
    # app.include_router(products_router,   prefix=f"{API_PREFIX}/products",   tags=["Products"])
    # app.include_router(categories_router, prefix=f"{API_PREFIX}/categories", tags=["Categories"])
    # app.include_router(cart_router,       prefix=f"{API_PREFIX}/cart",       tags=["Cart"])
    # app.include_router(orders_router,     prefix=f"{API_PREFIX}/orders",     tags=["Orders"])
    # app.include_router(payments_router,   prefix=f"{API_PREFIX}/payments",   tags=["Payments"])
    # app.include_router(reviews_router,    prefix=f"{API_PREFIX}/reviews",    tags=["Reviews"])
    # app.include_router(coupons_router,    prefix=f"{API_PREFIX}/coupons",    tags=["Coupons"])
    # app.include_router(admin_router,      prefix=f"{API_PREFIX}/admin",      tags=["Admin"])

    return app


app = create_app()
