"""
Service layer for business logic.
Encapsulates complex business operations separate from API endpoints.
"""
from decimal import Decimal
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta

import structlog
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cart import Cart, CartItem
from app.models.coupon import Coupon, CouponUsage
from app.models.inventory_reservation import InventoryReservation, ReservationStatus
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product

logger = structlog.get_logger(__name__)


class CartService:
    """Service for cart-related business logic."""

    @staticmethod
    async def get_or_create_cart(user_id: UUID, db: AsyncSession) -> Cart:
        """Get existing cart or create new one."""
        query = select(Cart).where(Cart.user_id == user_id)
        result = await db.execute(query)
        cart = result.scalar_one_or_none()

        if not cart:
            cart = Cart(user_id=user_id)
            db.add(cart)
            await db.commit()
            await db.refresh(cart)

        return cart

    @staticmethod
    async def validate_cart_items(cart: Cart, db: AsyncSession) -> list[dict]:
        """Validate all items in cart and return issues."""
        issues = []

        for item in cart.items:
            product_query = select(Product).where(Product.id == item.product_id)
            product_result = await db.execute(product_query)
            product = product_result.scalar_one_or_none()

            if not product:
                issues.append(f"Product {item.product_id} no longer available")
                continue

            if not product.is_in_stock:
                issues.append(f"Product '{product.title}' out of stock")
                continue

            if product.available_stock < int(item.quantity):
                issues.append(
                    f"Only {product.available_stock} of '{product.title}' available"
                )

        return issues


class InventoryService:
    """Service for inventory management and reservations."""

    @staticmethod
    async def reserve_inventory(
        order_id: UUID,
        items: list[dict],
        db: AsyncSession,
        expires_minutes: int = 15,
    ) -> bool:
        """
        Reserve inventory for order items.

        Returns True if all items successfully reserved, False otherwise.
        """
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

        for item in items:
            product_id = item["product_id"]
            quantity = item["quantity"]

            # Check availability
            product_query = select(Product).where(Product.id == product_id)
            product_result = await db.execute(product_query)
            product = product_result.scalar_one_or_none()

            if not product or product.available_stock < quantity:
                logger.error(
                    "Insufficient inventory for reservation",
                    product_id=product_id,
                    requested=quantity,
                    available=product.available_stock if product else 0,
                )
                return False

            # Create reservation
            reservation = InventoryReservation(
                order_id=order_id,
                product_id=product_id,
                quantity=quantity,
                status=ReservationStatus.reserved,
                expires_at=expires_at,
            )
            db.add(reservation)

            # Update product reserved stock
            product.reserved_stock += quantity

        await db.commit()
        return True

    @staticmethod
    async def confirm_reservation(order_id: UUID, db: AsyncSession) -> bool:
        """Confirm inventory reservation and deduct from stock."""
        query = select(InventoryReservation).where(
            and_(
                InventoryReservation.order_id == order_id,
                InventoryReservation.status == ReservationStatus.reserved,
            )
        )
        result = await db.execute(query)
        reservations = result.scalars().all()

        for reservation in reservations:
            # Get product
            product_query = select(Product).where(Product.id == reservation.product_id)
            product_result = await db.execute(product_query)
            product = product_result.scalar_one_or_none()

            if product:
                # Deduct from stock and clear reserved
                product.stock -= reservation.quantity
                product.reserved_stock -= reservation.quantity

            # Update reservation status
            reservation.status = ReservationStatus.confirmed

        await db.commit()
        return True

    @staticmethod
    async def release_reservation(order_id: UUID, db: AsyncSession) -> bool:
        """Release inventory reservation back to available stock."""
        query = select(InventoryReservation).where(
            and_(
                InventoryReservation.order_id == order_id,
                InventoryReservation.status == ReservationStatus.reserved,
            )
        )
        result = await db.execute(query)
        reservations = result.scalars().all()

        for reservation in reservations:
            # Get product
            product_query = select(Product).where(Product.id == reservation.product_id)
            product_result = await db.execute(product_query)
            product = product_result.scalar_one_or_none()

            if product:
                # Release reserved stock back
                product.reserved_stock -= reservation.quantity

            # Update reservation status
            reservation.status = ReservationStatus.released

        await db.commit()
        return True


class CouponService:
    """Service for coupon and promotion logic."""

    @staticmethod
    async def validate_coupon(
        code: str,
        user_id: UUID,
        subtotal: Decimal,
        db: AsyncSession,
    ) -> tuple[bool, Optional[Coupon], Decimal, str]:
        """
        Validate coupon and calculate discount.

        Returns:
            (is_valid, coupon, discount_amount, message)
        """
        # Get coupon
        query = select(Coupon).where(Coupon.code == code)
        result = await db.execute(query)
        coupon = result.scalar_one_or_none()

        if not coupon:
            return False, None, Decimal("0"), "Invalid coupon code"

        # Check validity
        if not coupon.is_valid():
            if not coupon.is_active:
                return False, coupon, Decimal("0"), "Coupon is not active"
            if coupon.expires_at and coupon.expires_at < datetime.now(timezone.utc):
                return False, coupon, Decimal("0"), "Coupon has expired"
            if coupon.usage_limit and coupon.times_used >= coupon.usage_limit:
                return False, coupon, Decimal("0"), "Coupon usage limit reached"

        # Check minimum order amount
        if subtotal < coupon.min_order_amount:
            return (
                True,
                coupon,
                Decimal("0"),
                f"Minimum order amount ${coupon.min_order_amount} not met",
            )

        # Check user usage limit
        usage_query = select(func.count()).select_from(
            select(CouponUsage).where(
                and_(
                    CouponUsage.coupon_id == coupon.id,
                    CouponUsage.user_id == user_id,
                )
            ).subquery()
        )
        usage_result = await db.execute(usage_query)
        user_usage = usage_result.scalar()

        if user_usage >= coupon.per_user_limit:
            return (
                True,
                coupon,
                Decimal("0"),
                f"Coupon already used {user_usage} times",
            )

        # Calculate discount
        if coupon.coupon_type.value == "percentage":
            discount = subtotal * (coupon.value / 100)
        else:
            discount = coupon.value

        return True, coupon, discount, "Coupon is valid"


class OrderService:
    """Service for order-related business logic."""

    @staticmethod
    async def create_order_from_cart(
        user_id: UUID,
        cart: Cart,
        shipping_address: dict,
        billing_address: Optional[dict],
        coupon_code: Optional[str],
        db: AsyncSession,
    ) -> Order:
        """Create order from cart items."""
        # Calculate totals
        subtotal = cart.subtotal
        discount_amount = Decimal("0")
        coupon_id = None

        # Apply coupon if provided
        if coupon_code:
            is_valid, coupon, discount, message = await CouponService.validate_coupon(
                coupon_code, user_id, subtotal, db
            )
            if is_valid and discount > 0:
                discount_amount = discount
                coupon_id = coupon.id

        # Calculate totals
        tax_amount = Decimal("0")  # TODO: Implement tax calculation
        shipping_amount = Decimal("0")  # TODO: Implement shipping calculation
        total = subtotal - discount_amount + tax_amount + shipping_amount

        # Create order
        order = Order(
            user_id=user_id,
            status=OrderStatus.pending,
            shipping_address=shipping_address,
            billing_address=billing_address,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            shipping_amount=shipping_amount,
            total=total,
            coupon_id=coupon_id,
            coupon_code=coupon_code,
        )
        db.add(order)
        await db.flush()

        # Create order items
        for cart_item in cart.items:
            product_query = select(Product).where(Product.id == cart_item.product_id)
            product_result = await db.execute(product_query)
            product = product_result.scalar_one_or_none()

            order_item = OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                vendor_id=product.vendor_id if product else None,
                wholesale_price_snapshot=product.wholesale_price if product else None,
                sku=product.sku if product else "UNKNOWN",
                title=product.title if product else "Unknown Product",
                unit_price=cart_item.price_snapshot,
                quantity=int(cart_item.quantity),
                variant=product.variants if product else None,
                image_url=product.primary_image_url if product else None,
            )
            db.add(order_item)

        await db.commit()
        await db.refresh(order)

        logger.info(
            "Order created from cart",
            user_id=user_id,
            order_id=order.id,
            total=float(total),
        )

        return order
