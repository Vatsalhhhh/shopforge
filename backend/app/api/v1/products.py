"""
Product API endpoints.
Provides product listing, search, filtering, and review functionality.
"""
from decimal import Decimal
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.product import Product, ProductStatus
from app.models.review import Review
from app.models.user import User
from app.schemas.product import (
    ProductFilterParams,
    ProductListResponse,
    ProductResponse,
    ReviewCreate,
    ReviewListResponse,
    ReviewResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    search: Optional[str] = Query(None, description="Search in title and description"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[Decimal] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[Decimal] = Query(None, ge=0, description="Maximum price"),
    in_stock_only: bool = Query(False, description="Only show in-stock products"),
    is_featured: bool = Query(False, description="Only show featured products"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor"),
    sort_by: str = Query("created_at", description="Sort field: created_at, price, title, stock"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """
    List products with filtering, search, and pagination.

    Only returns active and approved products.
    """
    # Build base query
    query = (
        select(Product)
        .where(
            and_(
                Product.status == ProductStatus.active,
                Product.is_approved == True,
            )
        )
    )

    # Apply filters
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Product.title.ilike(search_pattern),
                Product.description.ilike(search_pattern),
                Product.sku.ilike(search_pattern),
            )
        )

    if category_id:
        query = query.where(Product.category_id == category_id)

    if min_price is not None:
        query = query.where(Product.effective_price >= min_price)

    if max_price is not None:
        query = query.where(Product.effective_price <= max_price)

    if in_stock_only:
        query = query.where(Product.is_in_stock == True)

    if is_featured:
        query = query.where(Product.is_featured == True)

    if vendor_id:
        query = query.where(Product.vendor_id == vendor_id)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply sorting
    sort_column = getattr(Product, sort_by, Product.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    # Execute query
    result = await db.execute(query)
    products = result.scalars().all()

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return ProductListResponse(
        items=products,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get product details by ID.

    Only returns active and approved products.
    """
    query = select(Product).where(
        and_(
            Product.id == product_id,
            Product.status == ProductStatus.active,
            Product.is_approved == True,
        )
    )

    result = await db.execute(query)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


@router.get("/{product_id}/reviews", response_model=ReviewListResponse)
async def get_product_reviews(
    product_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Get reviews for a product.

    Only returns approved reviews.
    """
    # Verify product exists
    product_query = select(Product).where(Product.id == product_id)
    product_result = await db.execute(product_query)
    product = product_result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Get reviews
    query = (
        select(Review)
        .where(
            and_(
                Review.product_id == product_id,
                Review.is_approved == True,
            )
        )
        .order_by(Review.created_at.desc())
    )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    # Execute query
    result = await db.execute(query)
    reviews = result.scalars().all()

    # Calculate average rating and distribution
    stats_query = select(
        func.avg(Review.rating).label("average_rating"),
        func.count(Review.id).label("total_reviews"),
    ).where(
        and_(
            Review.product_id == product_id,
            Review.is_approved == True,
        )
    )

    stats_result = await db.execute(stats_query)
    stats = stats_result.one()

    average_rating = float(stats.average_rating) if stats.average_rating else None

    # Get rating distribution
    dist_query = select(
        Review.rating, func.count(Review.id).label("count")
    ).where(
        and_(
            Review.product_id == product_id,
            Review.is_approved == True,
        )
    ).group_by(Review.rating)

    dist_result = await db.execute(dist_query)
    rating_distribution = {row.rating: row.count for row in dist_result}

    return ReviewListResponse(
        items=reviews,
        total=total,
        average_rating=average_rating,
        rating_distribution=rating_distribution,
    )


@router.post("/{product_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    product_id: str,
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a review for a product.

    Users can only review products they have purchased (verified_purchase).
    One review per user per product.
    """
    # Verify product exists
    product_query = select(Product).where(Product.id == product_id)
    product_result = await db.execute(product_query)
    product = product_result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Check if user already reviewed this product
    existing_review_query = select(Review).where(
        and_(
            Review.user_id == current_user.id,
            Review.product_id == product_id,
        )
    )
    existing_review_result = await db.execute(existing_review_query)
    existing_review = existing_review_result.scalar_one_or_none()

    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product",
        )

    # TODO: Check if user has purchased this product
    # This would require checking order_items for verified_purchase

    # Create review
    review = Review(
        user_id=current_user.id,
        product_id=product_id,
        rating=review_data.rating,
        title=review_data.title,
        body=review_data.body,
        is_approved=True,  # Auto-approve for now, can be changed to False for moderation
    )

    db.add(review)
    await db.commit()
    await db.refresh(review)

    logger.info(
        "Review created",
        user_id=current_user.id,
        product_id=product_id,
        rating=review_data.rating,
    )

    return review
