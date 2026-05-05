"""
Order and OrderItem ORM models.
order_items stores a SNAPSHOT of the product data at purchase time
so deleted/modified products don't corrupt order history.
"""
import enum
import uuid
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedBase


class OrderStatus(str, enum.Enum):
    pending = "pending"           # created, awaiting payment
    paid = "paid"                 # payment confirmed
    processing = "processing"     # being packed/prepared
    shipped = "shipped"           # dispatched
    delivered = "delivered"       # received by customer
    cancelled = "cancelled"       # cancelled before shipment
    refunded = "refunded"         # payment refunded


class Order(TimestampedBase):
    __tablename__ = "orders"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status"),
        default=OrderStatus.pending,
        index=True,
        nullable=False,
    )

    # Address snapshots — frozen at order time, independent of address table
    shipping_address: Mapped[dict] = mapped_column(JSONB, nullable=False)
    billing_address: Mapped[dict | None] = mapped_column(JSONB)

    # Financials (all stored for audit trail)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    shipping_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Stripe
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)

    # Coupon applied
    coupon_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coupons.id", ondelete="SET NULL")
    )
    coupon_code: Mapped[str | None] = mapped_column(String(50))  # snapshot

    notes: Mapped[str | None] = mapped_column(Text)

    # ── Relationships ───────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="orders")  # noqa: F821
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    payment: Mapped["Payment | None"] = relationship(  # noqa: F821
        "Payment", back_populates="order", uselist=False
    )
    coupon: Mapped["Coupon | None"] = relationship("Coupon")  # noqa: F821
    inventory_reservations: Mapped[list["InventoryReservation"]] = relationship(  # noqa: F821
        "InventoryReservation", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(TimestampedBase):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # Nullable FK: product may be deleted later but order item persists
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
    )
    # Denormalized vendor_id for fast vendor order filtering
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="SET NULL"),
        index=True,
    )
    # Snapshot of wholesale price at order time
    wholesale_price_snapshot: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    # Snapshot columns — immutable record of what was ordered
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    variant: Mapped[dict | None] = mapped_column(JSONB)  # e.g. {"size": "L", "color": "Red"}
    image_url: Mapped[str | None] = mapped_column(String(500))

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product | None"] = relationship("Product", back_populates="order_items")  # noqa: F821

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity
