"""
Redis-backed sliding window rate limiter using slowapi.
swallow_errors=True means Redis connection failures degrade gracefully
(requests pass through) rather than returning 500 errors.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Use in-memory storage for tests; Redis for dev/prod
_storage_uri = "memory://" if settings.is_testing else settings.redis_url

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_api_per_minute}/minute"],
    storage_uri=_storage_uri,
    swallow_errors=True,   # Redis down → warn and allow request through
)
