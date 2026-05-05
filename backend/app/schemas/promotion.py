"""Promotion (Coupon) schemas for API requests and responses."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CouponResponse(BaseModel):
    """Schema for coupon response."""
    id: UUID
    code: str
    description: Optional[str]
    coupon_type: str
    value: Decimal
    min_order_amount: Decimal
    usage_limit: Optional[int]
    per_user_limit: int
    times_used: int
    expires_at: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True


class CouponValidationRequest(BaseModel):
    """Schema for coupon validation request."""
    code: str = Field(..., min_length=1, max_length=50)
    subtotal: Decimal = Field(..., ge=0)


class CouponValidationResponse(BaseModel):
    """Schema for coupon validation response."""
    is_valid: bool
    coupon: Optional[CouponResponse] = None
    discount_amount: Decimal = 0
    message: Optional[str] = None
    can_use: bool = False


class ActiveCouponsResponse(BaseModel):
    """Schema for active coupons response."""
    coupons: list[CouponResponse]
    total: int
