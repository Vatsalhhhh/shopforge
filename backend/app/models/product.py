"""
Product ORM model.
images and variants are stored as JSONB for schema flexibility.
Example variants: {"size": ["S","M","L"], "color": ["Red","Blue"]}
Example images:   [{"url": "...", "alt": "...", "is_primary": true}]
"""
import enum
import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedBase


class ProductStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class Product(TimestampedBase):
    __tablename__ = "products"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(280), unique=True, index=True, nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # Pricing (NUMERIC for exact decimal arithmetic — never use FLOAT for money)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    # Inventory
    stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # reserved_stock tracks units in pending checkouts to prevent overselling
    reserved_stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Metadata
    brand: Mapped[str | None] = mapped_column(String(100))
    weight_grams: Mapped[int | None] = mapped_column(Integer)  # for shipping calc
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus, name="product_status"),
        default=ProductStatus.draft,
        index=True,
        nullable=False,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # JSONB columns — flexible schema, good for search via GIN index
    images: Mapped[list | None] = mapped_column(JSONB, default=list)
    variants: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict)

    # Vendor / dropshipping fields
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="SET NULL"),
        index=True,
    )
    # Wholesale price = what vendor charges the platform; None for platform-owned products
    wholesale_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    # Admin must approve vendor products before they appear in the store
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # FK
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        index=True,
    )

    # ── Relationships ───────────────────────────────────────────
    vendor: Mapped["Vendor | None"] = relationship(  # noqa: F821
        "Vendor", back_populates="products"
    )
    category: Mapped["Category | None"] = relationship(  # noqa: F821
        "Category", back_populates="products"
    )
    reviews: Mapped[list["Review"]] = relationship(  # noqa: F821
        "Review", back_populates="product"
    )
    order_items: Mapped[list["OrderItem"]] = relationship(  # noqa: F821
        "OrderItem", back_populates="product"
    )
    cart_items: Mapped[list["CartItem"]] = relationship(  # noqa: F821
        "CartItem", back_populates="product"
    )

    @property
    def effective_price(self) -> Decimal:
        """The price a customer actually pays."""
        return self.discount_price if self.discount_price else self.price

    @property
    def available_stock(self) -> int:
        """Stock available for new orders (excludes reserved units)."""
        return max(0, self.stock - self.reserved_stock)

    @property
    def is_in_stock(self) -> bool:
        return self.available_stock > 0

    @property
    def primary_image_url(self) -> str | None:
        if not self.images:
            return None
        for img in self.images:
            if img.get("is_primary"):
                return img.get("url")
        return self.images[0].get("url") if self.images else None
