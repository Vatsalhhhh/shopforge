"""
Vendor authentication endpoints.
POST /api/v1/vendor/register  — create vendor account (pending approval)
POST /api/v1/vendor/login     — returns JWT tokens for vendor users

Vendor activation flow:
  register → email_verified → phone_verified → admin_approval → active
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.db.session import get_db
from app.models.auth_tokens import EmailVerificationToken
from app.models.user import User, UserRole, UserStatus
from app.models.vendor import Vendor, VendorStatus, VendorUser, VendorUserRole
from app.schemas.auth import LoginRequest, VendorRegisterRequest
from app.utils.email_service import send_verification_email

router = APIRouter(prefix="/vendor", tags=["Vendor Auth"])

_EMAIL_TOKEN_EXPIRY_HOURS = 24


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def vendor_register(body: VendorRegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Vendor registration. Creates User + Vendor (pending) + VendorUser (owner).
    Sends email verification. Vendor cannot sell until:
    1. Email verified  2. Phone verified  3. Admin approves
    """
    existing_user = await db.scalar(select(User).where(User.email == body.email))
    if existing_user:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered")

    existing_vendor = await db.scalar(select(Vendor).where(Vendor.business_email == body.business_email))
    if existing_vendor:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Business email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        role=UserRole.vendor,
        status=UserStatus.active,
        is_active=True,
        is_verified=False,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()

    vendor = Vendor(
        business_name=body.business_name,
        business_email=body.business_email,
        business_phone=body.business_phone,
        description=body.description,
        status=VendorStatus.pending,
    )
    db.add(vendor)
    await db.flush()

    db.add(VendorUser(vendor_id=vendor.id, user_id=user.id, role=VendorUserRole.owner, is_primary=True))

    token = secrets.token_urlsafe(48)
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=_hash_token(token),
        expires_at=_now() + timedelta(hours=_EMAIL_TOKEN_EXPIRY_HOURS),
    ))
    await db.commit()

    try:
        await send_verification_email(user.email, user.first_name, token)
    except Exception:
        pass  # Account created; email failure is non-fatal

    return {
        "message": "Application submitted. Please verify your email to continue.",
        "vendor_id": str(vendor.id),
        "status": vendor.status,
        "next_step": "verify_email",
    }


@router.post("/login")
async def vendor_login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Vendor login. Checks email_verified, phone_verified, and vendor status."""
    user = await db.scalar(
        select(User).where(User.email == body.email, User.role == UserRole.vendor, User.deleted_at.is_(None))
    )
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    if not user.is_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in."
        )

    if not user.phone_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Please verify your phone number before logging in."
        )

    vendor_user = await db.scalar(select(VendorUser).where(VendorUser.user_id == user.id))
    if not vendor_user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No vendor account linked")

    vendor = await db.get(Vendor, vendor_user.vendor_id)

    return {
        "access_token": create_access_token(user.id, user.role.value),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
        "user_id": str(user.id),
        "vendor_id": str(vendor.id),
        "vendor_status": vendor.status,
        "business_name": vendor.business_name,
        "email_verified": user.is_verified,
        "phone_verified": user.phone_verified,
    }
