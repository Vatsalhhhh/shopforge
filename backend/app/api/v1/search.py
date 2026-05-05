"""
Search API endpoints.
Provides full-text search with filtering and relevance scoring.
"""
from decimal import Decimal
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.category import Category
from app.models.product import Product, ProductStatus
from app.schemas.search import SearchRequest, SearchResponse

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResponse)
async def search_products(
    query: str = Query(..., min_length=1, max_length=100, description="Search query"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[Decimal] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[Decimal] = Query(None, ge=0, description="Maximum price"),
    in_stock_only: bool = Query(False, description="Only show in-stock products"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search products with full-text search and filtering.

    Returns:
    - Products matching the search query
    - Relevance scoring (title matches rank higher than description)
    - Category filters
    - Price range
    - Pagination
    """
    # Build base query
    search_pattern = f"%{query}%"

    # Calculate relevance score
    # Title match = 3 points, description match = 1 point
    title_match = func.coalesce(func.similarity(Product.title, query), 0)
    desc_match = func.coalesce(func.similarity(Product.description, query), 0)
    relevance_score = (title_match * 3) + desc_match

    base_query = (
        select(
            Product,
            relevance_score.label("relevance_score"),
        )
        .where(
            and_(
                Product.status == ProductStatus.active,
                Product.is_approved == True,
                or_(
                    Product.title.ilike(search_pattern),
                    Product.description.ilike(search_pattern),
                    Product.sku.ilike(search_pattern),
                ),
            )
        )
    )

    # Apply filters
    if category_id:
        base_query = base_query.where(Product.category_id == category_id)

    if min_price is not None:
        base_query = base_query.where(Product.effective_price >= min_price)

    if max_price is not None:
        base_query = base_query.where(Product.effective_price <= max_price)

    if in_stock_only:
        base_query = base_query.where(Product.is_in_stock == True)

    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply sorting by relevance, then created_at
    base_query = base_query.order_by(
        relevance_score.desc(),
        Product.created_at.desc(),
    )

    # Apply pagination
    offset = (page - 1) * page_size
    base_query = base_query.offset(offset).limit(page_size)

    # Execute query
    result = await db.execute(base_query)
    results = result.all()

    # Extract products and relevance scores
    products = []
    for row in results:
        product = row[0]
        score = row[1]
        products.append({
            "product": product,
            "relevance_score": float(score) if score else None,
        })

    # Get available categories for this search
    category_query = (
        select(Category)
        .join(Product, Category.id == Product.category_id)
        .where(
            and_(
                Product.status == ProductStatus.active,
                Product.is_approved == True,
                or_(
                    Product.title.ilike(search_pattern),
                    Product.description.ilike(search_pattern),
                ),
            )
        )
        .distinct()
    )
    category_result = await db.execute(category_query)
    categories = [
        {"id": str(cat.id), "name": cat.name, "slug": cat.slug}
        for cat in category_result.scalars().all()
    ]

    # Get price range for this search
    price_query = (
        select(
            func.min(Product.effective_price).label("min_price"),
            func.max(Product.effective_price).label("max_price"),
        )
        .where(
            and_(
                Product.status == ProductStatus.active,
                Product.is_approved == True,
                or_(
                    Product.title.ilike(search_pattern),
                    Product.description.ilike(search_pattern),
                ),
            )
        )
    )
    price_result = await db.execute(price_query)
    price_range = price_result.one()

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    # Build response items
    items = []
    for item_data in products:
        product = item_data["product"]
        items.append({
            "id": product.id,
            "title": product.title,
            "slug": product.slug,
            "sku": product.sku,
            "description": product.description,
            "price": product.price,
            "discount_price": product.discount_price,
            "effective_price": product.effective_price,
            "primary_image_url": product.primary_image_url,
            "is_in_stock": product.is_in_stock,
            "is_featured": product.is_featured,
            "category_id": product.category_id,
            "vendor_id": product.vendor_id,
            "relevance_score": item_data["relevance_score"],
        })

    return SearchResponse(
        query=query,
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        categories=categories,
        price_range={
            "min": price_range.min_price,
            "max": price_range.max_price,
        },
    )
