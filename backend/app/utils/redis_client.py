"""
Shared async Redis client with connection pooling.
"""
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings

_redis_client: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    """Return singleton Redis client (connection pool underneath)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


# ── Cache helpers ────────────────────────────────────────────────

async def cache_get(key: str) -> str | None:
    return await get_redis().get(key)


async def cache_set(key: str, value: str, ttl_seconds: int = 300) -> None:
    await get_redis().setex(key, ttl_seconds, value)


async def cache_delete(key: str) -> None:
    await get_redis().delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a glob pattern. Use carefully in production."""
    client = get_redis()
    keys = await client.keys(pattern)
    if keys:
        await client.delete(*keys)
