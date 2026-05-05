"""Search schemas for API requests and responses."""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SearchResultItem(BaseModel):
    """Schema for search result item."""
    id: UUID
    title: str
    slug: str
    sku: str
    description: Optional[str]
    price: Decimal
    discount_price: Optional[Decimal]
    effective_price: Decimal
    primary_image_url: Optional[str]
    is_in_stock: bool
    is_featured: bool
    category_id: Optional[UUID]
    vendor_id: Optional[UUID]
    relevance_score: Optional[float] = None

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    """Schema for search response."""
    query: str
    items: list[SearchResultItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    did_you_mean: Optional[str] = None
    categories: list[dict] = []
    price_range: dict[str, Optional[Decimal]] = {}


class SearchRequest(BaseModel):
    """Schema for search request."""
    query: str = Field(..., min_length=1, max_length=100)
    category_id: Optional[UUID] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    in_stock_only: bool = False
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
