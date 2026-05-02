"""Coupon and CouponUsage ORM models."""
import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedBase


class CouponType(str, enum.Enum):
    percentage = "percentage"   # value is 0–100
    fixed = "fixed"             # value is absolute dollar amount


class Coupon(TimestampedBase):
    __tablename__ = "coupons"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    coupon_type: Mapped[CouponType] = mapped_column(
        Enum(CouponType, name="coupon_type"), nullable=False
    )
    value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_order_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    usage_limit: Mapped[int | None] = mapped_column(Integer)        # None = unlimited
    per_user_limit: Mapped[int] = mapped_column(Integer, default=1)
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    usages: Mapped[list["CouponUsage"]] = relationship(
        "CouponUsage", back_populates="coupon"
    )

    def is_valid(self) -> bool:
        from datetime import timezone
        if not self.is_active:
            return False
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False
        if self.usage_limit is not None and self.times_used >= self.usage_limit:
            return False
        return True


class CouponUsage(TimestampedBase):
    __tablename__ = "coupon_usages"
    __table_args__ = (
        UniqueConstraint("coupon_id", "order_id", name="uq_coupon_order"),
    )

    coupon_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("coupons.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )

    coupon: Mapped["Coupon"] = relationship("Coupon", back_populates="usages")
