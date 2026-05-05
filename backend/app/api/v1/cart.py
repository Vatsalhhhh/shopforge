"""
Cart API endpoints.
Provides cart management functionality with inventory validation.
"""
from decimal import Decimal
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product, ProductStatus
from app.models.user import User
from app.schemas.cart import (
    AddToCartRequest,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
    CartValidationResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/cart", tags=["Cart"])


async def get_user_cart(user_id: str, db: AsyncSession) -> Cart:
    """Get or create user's cart."""
    query = select(Cart).where(Cart.user_id == user_id).options(selectinload(Cart.items))
    result = await db.execute(query)
    cart = result.scalar_one_or_none()

    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        await db.commit()
        await db.refresh(cart)
        # Reload with items
        query = select(Cart).where(Cart.id == cart.id).options(selectinload(Cart.items))
        result = await db.execute(query)
        cart = result.scalar_one()

    return cart


@router.get("", response_model=CartResponse)
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's shopping cart."""
    cart = await get_user_cart(current_user.id, db)

    # Load product details for each cart item
    items_with_products = []
    for item in cart.items:
        product_query = select(Product).where(Product.id == item.product_id)
        product_result = await db.execute(product_query)
        product = product_result.scalar_one_or_none()

        item_data = CartItemResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=int(item.quantity),
            price_at_add=item.price_snapshot,
            line_total=item.line_total,
            product={
                "id": product.id if product else None,
                "title": product.title if product else "Product not available",
                "slug": product.slug if product else None,
                "price": float(product.effective_price) if product else None,
                "primary_image_url": product.primary_image_url if product else None,
                "is_in_stock": product.is_in_stock if product else False,
                "available_stock": product.available_stock if product else 0,
            } if product else None,
        )
        items_with_products.append(item_data)

    return CartResponse(
        id=cart.id,
        user_id=cart.user_id,
        items=items_with_products,
        subtotal=float(cart.subtotal),
        item_count=len(cart.items),
    )


@router.post("/items", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    request: AddToCartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add item to cart.

    Validates:
    - Product exists and is active
    - Sufficient inventory available
    - Quantity limits
    """
    # Get product
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

    # Check inventory
    if not product.is_in_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is out of stock",
        )

    if product.available_stock < request.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.available_stock} items available",
        )

    # Get or create cart
    cart = await get_user_cart(current_user.id, db)

    # Check if item already in cart
    existing_item_query = select(CartItem).where(
        and_(
            CartItem.cart_id == cart.id,
            CartItem.product_id == request.product_id,
        )
    )
    existing_item_result = await db.execute(existing_item_query)
    existing_item = existing_item_result.scalar_one_or_none()

    if existing_item:
        # Update quantity
        new_quantity = int(existing_item.quantity) + request.quantity

        # Check inventory again
        if product.available_stock < new_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {product.available_stock} items available",
            )

        existing_item.quantity = new_quantity
        await db.commit()
        await db.refresh(existing_item)

        logger.info(
            "Cart item updated",
            user_id=current_user.id,
            cart_id=cart.id,
            product_id=request.product_id,
            quantity=new_quantity,
        )

        return CartItemResponse(
            id=existing_item.id,
            product_id=existing_item.product_id,
            quantity=int(existing_item.quantity),
            price_at_add=existing_item.price_snapshot,
            line_total=existing_item.line_total,
        )
    else:
        # Add new item
        cart_item = CartItem(
            cart_id=cart.id,
            product_id=request.product_id,
            quantity=request.quantity,
            price_snapshot=product.effective_price,
        )
        db.add(cart_item)
        await db.commit()
        await db.refresh(cart_item)

        logger.info(
            "Item added to cart",
            user_id=current_user.id,
            cart_id=cart.id,
            product_id=request.product_id,
            quantity=request.quantity,
        )

        return CartItemResponse(
            id=cart_item.id,
            product_id=cart_item.product_id,
            quantity=int(cart_item.quantity),
            price_at_add=cart_item.price_snapshot,
            line_total=cart_item.line_total,
        )


@router.put("/items/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: str,
    update_data: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update cart item quantity.

    Validates inventory availability.
    """
    # Get cart item with cart
    query = (
        select(CartItem)
        .join(Cart)
        .where(
            and_(
                CartItem.id == item_id,
                Cart.user_id == current_user.id,
            )
        )
    )
    result = await db.execute(query)
    cart_item = result.scalar_one_or_none()

    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )

    # Get product to check inventory
    product_query = select(Product).where(Product.id == cart_item.product_id)
    product_result = await db.execute(product_query)
    product = product_result.scalar_one_or_none()

    if product and product.available_stock < update_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.available_stock} items available",
        )

    # Update quantity
    cart_item.quantity = update_data.quantity
    await db.commit()
    await db.refresh(cart_item)

    logger.info(
        "Cart item quantity updated",
        user_id=current_user.id,
        item_id=item_id,
        quantity=update_data.quantity,
    )

    return CartItemResponse(
        id=cart_item.id,
        product_id=cart_item.product_id,
        quantity=int(cart_item.quantity),
        price_at_add=cart_item.price_snapshot,
        line_total=cart_item.line_total,
    )


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_cart_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove item from cart."""
    # Get cart item with cart
    query = (
        select(CartItem)
        .join(Cart)
        .where(
            and_(
                CartItem.id == item_id,
                Cart.user_id == current_user.id,
            )
        )
    )
    result = await db.execute(query)
    cart_item = result.scalar_one_or_none()

    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )

    await db.delete(cart_item)
    await db.commit()

    logger.info(
        "Cart item removed",
        user_id=current_user.id,
        item_id=item_id,
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear all items from cart."""
    # Get cart
    cart = await get_user_cart(current_user.id, db)

    # Delete all items
    for item in cart.items:
        await db.delete(item)

    await db.commit()

    logger.info(
        "Cart cleared",
        user_id=current_user.id,
        cart_id=cart.id,
    )


@router.post("/validate", response_model=CartValidationResponse)
async def validate_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate cart before checkout.

    Checks:
    - All products are still available
    - Sufficient inventory
    - Prices haven't changed significantly
    """
    cart = await get_user_cart(current_user.id, db)

    issues = []
    valid_items = []

    for item in cart.items:
        # Get current product state
        product_query = select(Product).where(Product.id == item.product_id)
        product_result = await db.execute(product_query)
        product = product_result.scalar_one_or_none()

        if not product:
            issues.append(f"Product {item.product_id} is no longer available")
            continue

        if product.status != ProductStatus.active or not product.is_approved:
            issues.append(f"Product '{product.title}' is not available")
            continue

        if not product.is_in_stock:
            issues.append(f"Product '{product.title}' is out of stock")
            continue

        if product.available_stock < int(item.quantity):
            issues.append(
                f"Only {product.available_stock} of '{product.title}' available (you have {int(item.quantity)})"
            )
            continue

        # Check for significant price changes (>10%)
        price_change_pct = abs(
            (product.effective_price - item.price_snapshot) / item.price_snapshot * 100
        ) if item.price_snapshot > 0 else 0

        if price_change_pct > 10:
            issues.append(
                f"Price for '{product.title}' has changed by {price_change_pct:.1f}%"
            )

        valid_items.append({
            "id": str(item.id),
            "product_id": str(item.product_id),
            "title": product.title,
            "quantity": int(item.quantity),
            "price_at_add": float(item.price_snapshot),
            "current_price": float(product.effective_price),
            "line_total": float(item.line_total),
        })

    is_valid = len(issues) == 0

    return CartValidationResponse(
        is_valid=is_valid,
        items=valid_items,
        subtotal=float(cart.subtotal),
        issues=issues,
    )
