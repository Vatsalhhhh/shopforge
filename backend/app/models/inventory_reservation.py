"""Inventory reservation ORM model — prevent race conditions during checkout by reserving inventory."""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedBase


class ReservationStatus(str, enum.Enum):
    """Status of inventory reservation."""
    reserved = "reserved"  # Inventory reserved for order
    confirmed = "confirmed"  # Order confirmed, inventory deducted
    released = "released"  # Order cancelled, inventory released back


class InventoryReservation(TimestampedBase):
    """Inventory reservation — temporary hold on product inventory during checkout."""
    __tablename__ = "inventory_reservations"
    __table_args__ = (
        UniqueConstraint("order_id", "product_id", name="uq_order_product_reservation"),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ReservationStatus] = mapped_column(
        Enum(ReservationStatus, name="reservation_status"),
        default=ReservationStatus.reserved,
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc) + datetime.timedelta(minutes=15),
    )

    order: Mapped["Order"] = relationship("Order", back_populates="inventory_reservations")  # noqa: F821
    product: Mapped["Product"] = relationship("Product")  # noqa: F821

    @property
    def is_expired(self) -> bool:
        """Check if reservation has expired."""
        return datetime.now(timezone.utc) > self.expires_at

    def __repr__(self):
        return f"<InventoryReservation(id={self.id}, order_id={self.order_id}, product_id={self.product_id}, quantity={self.quantity}, status={self.status})>"
