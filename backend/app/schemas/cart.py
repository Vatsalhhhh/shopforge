"""Cart schemas for API requests and responses."""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CartItemBase(BaseModel):
    """Base cart item schema."""
    product_id: UUID
    quantity: int = Field(..., gt=0)


class CartItemCreate(CartItemBase):
    """Schema for adding item to cart."""
    pass


class CartItemUpdate(BaseModel):
    """Schema for updating cart item quantity."""
    quantity: int = Field(..., gt=0)


class CartItemResponse(BaseModel):
    """Schema for cart item response."""
    id: UUID
    product_id: UUID
    quantity: int
    price_at_add: Decimal
    line_total: Decimal
    product: Optional[dict] = None  # Product details snapshot
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class CartResponse(BaseModel):
    """Schema for cart response."""
    id: UUID
    user_id: UUID
    items: list[CartItemResponse]
    subtotal: Decimal
    item_count: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CartValidationResponse(BaseModel):
    """Schema for cart validation response."""
    is_valid: bool
    items: list[dict]
    subtotal: Decimal
    issues: list[str] = []


class AddToCartRequest(BaseModel):
    """Schema for add to cart request."""
    product_id: UUID
    quantity: int = Field(1, gt=0, le=10)  # Max 10 items per add
