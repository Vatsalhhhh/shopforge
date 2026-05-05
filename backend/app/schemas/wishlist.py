"""Wishlist schemas for API requests and responses."""
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class WishlistItemResponse(BaseModel):
    """Schema for wishlist item response."""
    id: UUID
    user_id: UUID
    product_id: UUID
    product: Optional[dict] = None  # Product details
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class WishlistResponse(BaseModel):
    """Schema for wishlist response."""
    items: list[WishlistItemResponse]
    total: int


class AddToWishlistRequest(BaseModel):
    """Schema for add to wishlist request."""
    product_id: UUID
