"""Payment ORM model — one payment record per order."""
import enum
import uuid
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedBase


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"
    refunded = "refunded"
    partially_refunded = "partially_refunded"


class Payment(TimestampedBase):
    __tablename__ = "payments"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        unique=True,       # one payment record per order
        nullable=False,
    )
    stripe_payment_intent_id: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.pending,
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    refunded_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    # All webhook events stored for audit/replay prevention
    webhook_events: Mapped[list] = mapped_column(JSONB, default=list)

    order: Mapped["Order"] = relationship("Order", back_populates="payment")  # noqa: F821
