"""Wishlist ORM model — track products users want to buy later."""
import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedBase


class WishlistItem(TimestampedBase):
    """Wishlist item — one entry per user-product pair."""
    __tablename__ = "wishlist_items"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_user_product_wishlist"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="wishlist_items")  # noqa: F821
    product: Mapped["Product"] = relationship("Product", back_populates="wishlist_items")  # noqa: F821

    def __repr__(self):
        return f"<WishlistItem(user_id={self.user_id}, product_id={self.product_id})>"
