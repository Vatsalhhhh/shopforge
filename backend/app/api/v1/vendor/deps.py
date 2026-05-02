"""
Dependency injection helpers for vendor portal routes.
"""
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.vendor import Vendor, VendorStatus, VendorUser

_bearer = HTTPBearer()


async def get_current_vendor_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, Vendor]:
    """
    Validates JWT, checks role=vendor, returns (user, vendor).
    Does NOT require vendor to be approved — use require_approved_vendor for that.
    """
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = await db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    if not user or user.role != UserRole.vendor:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Vendor access required")

    vendor_user = await db.scalar(select(VendorUser).where(VendorUser.user_id == user.id))
    if not vendor_user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No vendor account linked")

    vendor = await db.get(Vendor, vendor_user.vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    return user, vendor


async def require_approved_vendor(
    pair: tuple[User, Vendor] = Depends(get_current_vendor_user),
) -> tuple[User, Vendor]:
    """Extends get_current_vendor_user — additionally requires vendor to be approved."""
    user, vendor = pair
    if vendor.status != VendorStatus.approved:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail=f"Vendor account is {vendor.status}. Await admin approval.",
        )
    return user, vendor


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validates JWT and checks role=admin."""
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = await db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    if not user or user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admin access required")

    return user
