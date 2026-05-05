"""
Wishlist API endpoints.
Provides wishlist management functionality.
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.product import Product, ProductStatus
from app.models.user import User
from app.models.wishlist import WishlistItem
from app.schemas.wishlist import (
    AddToWishlistRequest,
    WishlistItemResponse,
    WishlistResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=WishlistResponse)
async def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's wishlist."""
    query = select(WishlistItem).where(WishlistItem.user_id == current_user.id)
    result = await db.execute(query)
    wishlist_items = result.scalars().all()

    # Load product details for each wishlist item
    items_with_products = []
    for item in wishlist_items:
        product_query = select(Product).where(Product.id == item.product_id)
        product_result = await db.execute(product_query)
        product = product_result.scalar_one_or_none()

        item_data = WishlistItemResponse(
            id=item.id,
            user_id=item.user_id,
            product_id=item.product_id,
            product={
                "id": product.id if product else None,
                "title": product.title if product else "Product not available",
                "slug": product.slug if product else None,
                "price": float(product.effective_price) if product else None,
                "primary_image_url": product.primary_image_url if product else None,
                "is_in_stock": product.is_in_stock if product else False,
                "is_featured": product.is_featured if product else False,
            } if product else None,
        )
        items_with_products.append(item_data)

    return WishlistResponse(
        items=items_with_products,
        total=len(items_with_products),
    )


@router.post("", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    request: AddToWishlistRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add product to wishlist.

    Validates product exists and is active.
    """
    # Check if product exists
    product_query = select(Product).where(
        and_(
            Product.id == request.product_id,
            Product.status == ProductStatus.active,
            Product.is_approved == True,
        )
    )
    product_result = await db.execute(product_query)
    product = product_result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Check if already in wishlist
    existing_query = select(WishlistItem).where(
        and_(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == request.product_id,
        )
    )
    existing_result = await db.execute(existing_query)
    existing_item = existing_result.scalar_one_or_none()

    if existing_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product already in wishlist",
        )

    # Add to wishlist
    wishlist_item = WishlistItem(
        user_id=current_user.id,
        product_id=request.product_id,
    )
    db.add(wishlist_item)
    await db.commit()
    await db.refresh(wishlist_item)

    logger.info(
        "Product added to wishlist",
        user_id=current_user.id,
        product_id=request.product_id,
    )

    return WishlistItemResponse(
        id=wishlist_item.id,
        user_id=wishlist_item.user_id,
        product_id=wishlist_item.product_id,
    )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove product from wishlist."""
    query = select(WishlistItem).where(
        and_(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id,
        )
    )
    result = await db.execute(query)
    wishlist_item = result.scalar_one_or_none()

    if not wishlist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found in wishlist",
        )

    await db.delete(wishlist_item)
    await db.commit()

    logger.info(
        "Product removed from wishlist",
        user_id=current_user.id,
        product_id=product_id,
    )
