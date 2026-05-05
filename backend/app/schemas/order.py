"""Order schemas for API requests and responses."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class OrderItemResponse(BaseModel):
    """Schema for order item response."""
    id: UUID
    product_id: Optional[UUID]
    vendor_id: Optional[UUID]
    sku: str
    title: str
    unit_price: Decimal
    quantity: int
    variant: Optional[dict]
    image_url: Optional[str]
    line_total: Decimal

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    """Schema for order response."""
    id: UUID
    user_id: UUID
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    shipping_amount: Decimal
    total: Decimal
    stripe_payment_intent_id: Optional[str]
    coupon_code: Optional[str]
    notes: Optional[str]
    shipping_address: dict
    billing_address: Optional[dict]
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    """Schema for order list response."""
    items: list[OrderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class OrderCancelRequest(BaseModel):
    """Schema for order cancellation request."""
    reason: Optional[str] = Field(None, max_length=500)


class OrderCancelResponse(BaseModel):
    """Schema for order cancellation response."""
    id: UUID
    status: str
    cancelled_at: Optional[datetime]
    cancellation_reason: Optional[str]
