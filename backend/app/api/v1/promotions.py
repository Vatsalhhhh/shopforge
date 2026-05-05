"""
Promotion (Coupon) API endpoints.
Provides coupon validation and listing functionality.
"""
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.coupon import Coupon, CouponUsage
from app.models.user import User
from app.schemas.promotion import (
    ActiveCouponsResponse,
    CouponResponse,
    CouponValidationRequest,
    CouponValidationResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/promotions", tags=["Promotions"])


@router.post("/validate", response_model=CouponValidationResponse)
async def validate_coupon(
    request: CouponValidationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate a coupon code for the current user.

    Checks:
    - Coupon exists and is active
    - Not expired
    - Not exceeded usage limit
    - User hasn't exceeded per-user limit
    - Meets minimum order amount
    """
    # Get coupon
    query = select(Coupon).where(Coupon.code == request.code)
    result = await db.execute(query)
    coupon = result.scalar_one_or_none()

    if not coupon:
        return CouponValidationResponse(
            is_valid=False,
            message="Invalid coupon code",
            can_use=False,
        )

    # Check if coupon is valid
    if not coupon.is_valid():
        if not coupon.is_active:
            return CouponValidationResponse(
                is_valid=False,
                message="Coupon is not active",
                can_use=False,
            )

        if coupon.expires_at and datetime.now(timezone.utc) > coupon.expires_at:
            return CouponValidationResponse(
                is_valid=False,
                message="Coupon has expired",
                can_use=False,
            )

        if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
            return CouponValidationResponse(
                is_valid=False,
                message="Coupon usage limit reached",
                can_use=False,
            )

    # Check minimum order amount
    if request.subtotal < coupon.min_order_amount:
        return CouponValidationResponse(
            is_valid=True,
            coupon=coupon,
            discount_amount=0,
            message=f"Minimum order amount ${coupon.min_order_amount} not met",
            can_use=False,
        )

    # Check user's usage limit
    usage_query = select(func.count()).select_from(
        select(CouponUsage).where(
            and_(
                CouponUsage.coupon_id == coupon.id,
                CouponUsage.user_id == current_user.id,
            )
        ).subquery()
    )
    usage_result = await db.execute(usage_query)
    user_usage_count = usage_result.scalar()

    if user_usage_count >= coupon.per_user_limit:
        return CouponValidationResponse(
            is_valid=True,
            coupon=coupon,
            discount_amount=0,
            message=f"You have already used this coupon {user_usage_count} times",
            can_use=False,
        )

    # Calculate discount amount
    if coupon.coupon_type.value == "percentage":
        discount_amount = request.subtotal * (coupon.value / 100)
    else:  # fixed amount
        discount_amount = coupon.value

    # Apply max discount if set
    # Note: This would need to be added to the Coupon model

    return CouponValidationResponse(
        is_valid=True,
        coupon=coupon,
        discount_amount=discount_amount,
        message="Coupon is valid",
        can_use=True,
    )


@router.get("/active", response_model=ActiveCouponsResponse)
async def list_active_coupons(
    db: AsyncSession = Depends(get_db),
):
    """
    List all active coupons.

    Returns coupons that are:
    - Active
    - Not expired
    - Not exceeded usage limit
    """
    now = datetime.now(timezone.utc)

    query = select(Coupon).where(
        and_(
            Coupon.is_active == True,
            or_(
                Coupon.expires_at.is_(None),
                Coupon.expires_at > now,
            ),
            or_(
                Coupon.usage_limit.is_(None),
                Coupon.times_used < Coupon.usage_limit,
            ),
        )
    ).order_by(Coupon.created_at.desc())

    result = await db.execute(query)
    coupons = result.scalars().all()

    return ActiveCouponsResponse(
        coupons=coupons,
        total=len(coupons),
    )
