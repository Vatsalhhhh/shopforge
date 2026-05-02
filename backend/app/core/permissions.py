"""
FastAPI dependency injectors for role-based access control (RBAC).
Usage:
    @router.get("/admin/...", dependencies=[Depends(require_admin)])
    async def admin_only_endpoint(...):
        ...
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def _extract_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_payload(
    payload: dict = Depends(_extract_payload),
) -> dict:
    """Returns raw JWT payload. Use when you only need user_id/role."""
    return payload


def require_auth(payload: dict = Depends(_extract_payload)) -> dict:
    """Any authenticated user."""
    return payload


def require_admin(payload: dict = Depends(_extract_payload)) -> dict:
    """Admin role required."""
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return payload


def require_customer(payload: dict = Depends(_extract_payload)) -> dict:
    """Customer or admin."""
    if payload.get("role") not in ("customer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )
    return payload


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    """Returns payload if token is provided and valid, None otherwise. Used for guest-aware endpoints."""
    if not credentials:
        return None
    try:
        return decode_access_token(credentials.credentials)
    except JWTError:
        return None
