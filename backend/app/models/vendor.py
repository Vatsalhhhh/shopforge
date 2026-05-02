"""
Vendor portal ORM models.

Flow:
  Vendor registers → status=pending → admin approves → status=approved → can sell
  Products submitted by vendor → is_approved=False → admin approves → visible in store
  Order placed → VendorOrder created per vendor → vendor ships → Shipment record added
  Platform tracks payouts: wholesale_total owed to vendor after margin deduction
"""
import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampedBase


# ── Enums ────────────────────────────────────────────────────────────────────

class VendorStatus(str, enum.Enum):
    pending   = "pending"    # awaiting admin review
    approved  = "approved"   # active vendor
    suspended = "suspended"  # temporarily blocked
    rejected  = "rejected"   # application denied


class VendorUserRole(str, enum.Enum):
    owner = "owner"   # primary account holder
    staff = "staff"   # additional team members


class DocumentType(str, enum.Enum):
    business_license = "business_license"
    tax_id           = "tax_id"
    bank_statement   = "bank_statement"
    id_proof         = "id_proof"
    other            = "other"


class DocumentStatus(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"


class VendorOrderStatus(str, enum.Enum):
    new             = "new"             # order just created
    sent_to_vendor  = "sent_to_vendor"  # vendor notified
    vendor_accepted = "vendor_accepted" # vendor confirmed they can fulfill
    processing      = "processing"      # vendor is packing
    shipped         = "shipped"         # dispatched with tracking
    delivered       = "delivered"       # customer received
    cancelled       = "cancelled"       # cancelled


class InventoryChangeReason(str, enum.Enum):
    sale         = "sale"
    restock      = "restock"
    adjustment   = "adjustment"
    return_      = "return"
    reservation  = "reservation"
    cancellation = "cancellation"


class PayoutStatus(str, enum.Enum):
    pending    = "pending"
    processing = "processing"
    paid       = "paid"
    failed     = "failed"


# ── Models ───────────────────────────────────────────────────────────────────

class Vendor(TimestampedBase):
    __tablename__ = "vendors"

    business_name:  Mapped[str]      = mapped_column(String(255), nullable=False)
    business_email: Mapped[str]      = mapped_column(String(255), unique=True, index=True, nullable=False)
    business_phone: Mapped[str|None] = mapped_column(String(30))
    description:    Mapped[str|None] = mapped_column(Text)
    logo_url:       Mapped[str|None] = mapped_column(String(500))

    # JSONB address blobs — flexible without extra tables
    business_address:  Mapped[dict|None] = mapped_column(JSONB)
    warehouse_address: Mapped[dict|None] = mapped_column(JSONB)

    # Sensitive: bank/payout details (encrypt at rest in prod via pgcrypto or app-level AES)
    bank_details: Mapped[dict|None] = mapped_column(JSONB)

    status: Mapped[VendorStatus] = mapped_column(
        Enum(VendorStatus, name="vendor_status"),
        default=VendorStatus.pending,
        index=True,
        nullable=False,
    )

    # Platform keeps (1 - commission_rate) × selling_price; vendor gets commission_rate × wholesale_price
    # Default: vendor gets 100% of their wholesale price; platform margin = selling - wholesale
    commission_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("1.0000"), nullable=False)

    # Aggregated stats (updated via triggers or background task)
    rating:        Mapped[float|None]   = mapped_column(Numeric(3, 2))
    total_orders:  Mapped[int]          = mapped_column(Integer, default=0, nullable=False)
    total_revenue: Mapped[Decimal]      = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)

    # Admin workflow
    approved_at:      Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    approved_by_id:   Mapped[uuid.UUID|None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    rejected_reason:  Mapped[str|None]      = mapped_column(Text)
    admin_notes:      Mapped[str|None]      = mapped_column(Text)

    # ── Relationships ───────────────────────────────────────────
    vendor_users:  Mapped[list["VendorUser"]]     = relationship("VendorUser", back_populates="vendor", cascade="all, delete-orphan")
    documents:     Mapped[list["VendorDocument"]] = relationship("VendorDocument", back_populates="vendor", cascade="all, delete-orphan")
    products:      Mapped[list["Product"]]        = relationship("Product", back_populates="vendor")  # noqa: F821
    vendor_orders: Mapped[list["VendorOrder"]]    = relationship("VendorOrder", back_populates="vendor")
    payouts:       Mapped[list["Payout"]]         = relationship("Payout", back_populates="vendor")
    inventory_logs: Mapped[list["InventoryLog"]]  = relationship("InventoryLog", back_populates="vendor")
    approved_by:   Mapped["User|None"]            = relationship("User", foreign_keys=[approved_by_id])  # noqa: F821

    @property
    def is_active(self) -> bool:
        return self.status == VendorStatus.approved

    @property
    def platform_margin_rate(self) -> Decimal:
        """Fraction of (selling_price - wholesale_price) that platform keeps."""
        return Decimal("1.0000") - self.commission_rate


class VendorUser(TimestampedBase):
    """Links a User account to a Vendor — supports multi-user vendor accounts."""
    __tablename__ = "vendor_users"
    __table_args__ = (UniqueConstraint("vendor_id", "user_id", name="uq_vendor_user"),)

    vendor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[VendorUserRole] = mapped_column(
        Enum(VendorUserRole, name="vendor_user_role"),
        default=VendorUserRole.owner,
        nullable=False,
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="vendor_users")
    user:   Mapped["User"]   = relationship("User", back_populates="vendor_memberships", foreign_keys=[user_id])  # noqa: F821


class VendorDocument(TimestampedBase):
    """Verification documents uploaded by vendor during onboarding."""
    __tablename__ = "vendor_documents"

    vendor_id:     Mapped[uuid.UUID]    = mapped_column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType, name="document_type"), nullable=False)
    file_url:      Mapped[str]          = mapped_column(String(500), nullable=False)
    file_name:     Mapped[str]          = mapped_column(String(255), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status"),
        default=DocumentStatus.pending,
        nullable=False,
    )
    reviewed_at:    Mapped[datetime|None]   = mapped_column(DateTime(timezone=True))
    reviewed_by_id: Mapped[uuid.UUID|None]  = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    notes:          Mapped[str|None]        = mapped_column(Text)

    vendor:      Mapped["Vendor"] = relationship("Vendor", back_populates="documents")
    reviewed_by: Mapped["User|None"] = relationship("User", foreign_keys=[reviewed_by_id])  # noqa: F821


class VendorOrder(TimestampedBase):
    """
    A slice of a customer Order belonging to a single vendor.
    One customer Order → N VendorOrders (one per vendor in the cart).
    """
    __tablename__ = "vendor_orders"

    order_id:  Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True)

    status: Mapped[VendorOrderStatus] = mapped_column(
        Enum(VendorOrderStatus, name="vendor_order_status"),
        default=VendorOrderStatus.new,
        index=True,
        nullable=False,
    )

    # Financial split (computed at order creation time from snapshot prices)
    wholesale_total:  Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    platform_margin:  Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    vendor_notes:  Mapped[str|None] = mapped_column(Text)
    admin_notes:   Mapped[str|None] = mapped_column(Text)

    payout_id: Mapped[uuid.UUID|None] = mapped_column(UUID(as_uuid=True), ForeignKey("payouts.id", ondelete="SET NULL"), index=True)

    # ── Relationships ───────────────────────────────────────────
    order:    Mapped["Order"]        = relationship("Order")       # noqa: F821
    vendor:   Mapped["Vendor"]       = relationship("Vendor", back_populates="vendor_orders")
    shipment: Mapped["Shipment|None"] = relationship("Shipment", back_populates="vendor_order", uselist=False)
    payout:   Mapped["Payout|None"]  = relationship("Payout", back_populates="vendor_orders", foreign_keys=[payout_id])


class Shipment(TimestampedBase):
    """Tracking info for a VendorOrder once it has been shipped."""
    __tablename__ = "shipments"

    vendor_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vendor_orders.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    carrier_name:           Mapped[str]          = mapped_column(String(100), nullable=False)
    tracking_number:        Mapped[str]          = mapped_column(String(200), nullable=False)
    estimated_delivery_date: Mapped[date|None]   = mapped_column(Date)
    notes:                  Mapped[str|None]     = mapped_column(Text)
    shipped_at:             Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    delivered_at:           Mapped[datetime|None] = mapped_column(DateTime(timezone=True))

    vendor_order: Mapped["VendorOrder"] = relationship("VendorOrder", back_populates="shipment")


class InventoryLog(TimestampedBase):
    """Immutable audit trail of every stock change for a product."""
    __tablename__ = "inventory_logs"

    product_id: Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id:  Mapped[uuid.UUID|None] = mapped_column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="SET NULL"), index=True)

    change_quantity: Mapped[int] = mapped_column(Integer, nullable=False)  # positive=add, negative=remove
    reason: Mapped[InventoryChangeReason] = mapped_column(
        Enum(InventoryChangeReason, name="inventory_change_reason"), nullable=False
    )
    previous_stock: Mapped[int]        = mapped_column(Integer, nullable=False)
    new_stock:      Mapped[int]        = mapped_column(Integer, nullable=False)
    reference_id:   Mapped[uuid.UUID|None] = mapped_column(UUID(as_uuid=True))  # order_id or manual ref
    notes:          Mapped[str|None]   = mapped_column(Text)

    vendor:  Mapped["Vendor|None"]  = relationship("Vendor", back_populates="inventory_logs")
    product: Mapped["Product"]      = relationship("Product")  # noqa: F821


class Payout(TimestampedBase):
    """
    Tracks money owed to a vendor for a given period.
    Created by admin (or automated job) after orders are delivered.
    """
    __tablename__ = "payouts"

    vendor_id:    Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True)
    period_start: Mapped[date]      = mapped_column(Date, nullable=False)
    period_end:   Mapped[date]      = mapped_column(Date, nullable=False)

    gross_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)  # sum of wholesale_total
    deductions:   Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)  # refunds, chargebacks
    net_amount:   Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)  # gross - deductions

    status: Mapped[PayoutStatus] = mapped_column(
        Enum(PayoutStatus, name="payout_status"),
        default=PayoutStatus.pending,
        index=True,
        nullable=False,
    )
    paid_at:           Mapped[datetime|None] = mapped_column(DateTime(timezone=True))
    payment_reference: Mapped[str|None]      = mapped_column(String(255))
    notes:             Mapped[str|None]      = mapped_column(Text)

    vendor:        Mapped["Vendor"]           = relationship("Vendor", back_populates="payouts")
    vendor_orders: Mapped[list["VendorOrder"]] = relationship("VendorOrder", back_populates="payout", foreign_keys="VendorOrder.payout_id")
