"""Product schemas for API requests and responses."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    """Base product schema."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0, decimal_places=2)
    discount_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    stock: int = Field(..., ge=0)
    brand: Optional[str] = Field(None, max_length=100)
    weight_grams: Optional[int] = Field(None, ge=0)
    is_featured: bool = False
    category_id: Optional[UUID] = None


class ProductCreate(ProductBase):
    """Schema for creating a product."""
    sku: str = Field(..., min_length=1, max_length=100)
    images: Optional[list] = []
    variants: Optional[dict] = {}
    metadata: Optional[dict] = {}


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    discount_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    stock: Optional[int] = Field(None, ge=0)
    brand: Optional[str] = Field(None, max_length=100)
    weight_grams: Optional[int] = Field(None, ge=0)
    is_featured: Optional[bool] = None
    category_id: Optional[UUID] = None
    images: Optional[list] = None
    variants: Optional[dict] = None
    metadata: Optional[dict] = None


class ProductResponse(BaseModel):
    """Schema for product response."""
    id: UUID
    title: str
    slug: str
    sku: str
    description: Optional[str]
    price: Decimal
    discount_price: Optional[Decimal]
    effective_price: Decimal
    stock: int
    available_stock: int
    is_in_stock: bool
    brand: Optional[str]
    weight_grams: Optional[int]
    status: str
    is_featured: bool
    images: Optional[list]
    variants: Optional[dict]
    metadata: Optional[dict]
    primary_image_url: Optional[str]
    category_id: Optional[UUID]
    vendor_id: Optional[UUID]
    is_approved: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Schema for product list response with pagination."""
    items: list[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProductFilterParams(BaseModel):
    """Schema for product filtering and search."""
    search: Optional[str] = None
    category_id: Optional[UUID] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    in_stock_only: bool = False
    is_featured: bool = False
    vendor_id: Optional[UUID] = None
    sort_by: Optional[str] = "created_at"  # created_at, price, title, stock
    sort_order: Optional[str] = "desc"  # asc, desc
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class ReviewBase(BaseModel):
    """Base review schema."""
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    body: Optional[str] = None


class ReviewCreate(ReviewBase):
    """Schema for creating a review."""
    product_id: UUID


class ReviewResponse(BaseModel):
    """Schema for review response."""
    id: UUID
    user_id: UUID
    product_id: UUID
    rating: int
    title: Optional[str]
    body: Optional[str]
    is_approved: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReviewListResponse(BaseModel):
    """Schema for review list response."""
    items: list[ReviewResponse]
    total: int
    average_rating: Optional[float]
    rating_distribution: dict[int, int]  # rating -> count
