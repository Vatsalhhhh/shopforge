"""Pydantic schemas for the vendor portal."""
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.vendor import (
    DocumentStatus, DocumentType, InventoryChangeReason,
    PayoutStatus, VendorOrderStatus, VendorStatus, VendorUserRole,
)


# ── Address blob (reused in business & warehouse address) ─────────────────────

class AddressSchema(BaseModel):
    line1:    str
    line2:    str | None = None
    city:     str
    state:    str
    zip_code: str
    country:  str = "US"


# ── Vendor registration ───────────────────────────────────────────────────────

class VendorRegisterRequest(BaseModel):
    # Account credentials
    email:      EmailStr
    password:   str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name:  str = Field(min_length=1, max_length=100)

    # Business info
    business_name:  str = Field(min_length=2, max_length=255)
    business_email: EmailStr
    business_phone: str | None = None
    description:    str | None = None


class VendorOnboardingRequest(BaseModel):
    """Submitted after registration to complete the vendor profile."""
    business_address:  AddressSchema | None = None
    warehouse_address: AddressSchema | None = None
    bank_details:      dict[str, Any] | None = None  # account_number, routing, bank_name, etc.
    description:       str | None = None
    logo_url:          str | None = None


# ── Vendor read schemas ───────────────────────────────────────────────────────

class VendorSummary(BaseModel):
    id:             uuid.UUID
    business_name:  str
    business_email: str
    status:         VendorStatus
    rating:         float | None
    total_orders:   int
    created_at:     datetime

    model_config = {"from_attributes": True}


class VendorDetail(VendorSummary):
    business_phone:    str | None
    description:       str | None
    logo_url:          str | None
    business_address:  dict | None
    warehouse_address: dict | None
    commission_rate:   Decimal
    total_revenue:     Decimal
    approved_at:       datetime | None
    rejected_reason:   str | None
    admin_notes:       str | None
    updated_at:        datetime

    model_config = {"from_attributes": True}


class VendorUpdateRequest(BaseModel):
    business_phone:    str | None = None
    description:       str | None = None
    logo_url:          str | None = None
    business_address:  AddressSchema | None = None
    warehouse_address: AddressSchema | None = None
    bank_details:      dict[str, Any] | None = None


# ── Vendor dashboard ──────────────────────────────────────────────────────────

class VendorDashboard(BaseModel):
    total_orders:    int
    pending_orders:  int
    shipped_orders:  int
    delivered_orders: int
    total_revenue:   Decimal
    pending_payout:  Decimal
    low_stock_count: int
    rating:          float | None
    vendor_status:   VendorStatus


# ── Documents ─────────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id:            uuid.UUID
    document_type: DocumentType
    file_url:      str
    file_name:     str
    status:        DocumentStatus
    reviewed_at:   datetime | None
    notes:         str | None
    created_at:    datetime

    model_config = {"from_attributes": True}


# ── Products (vendor-scoped) ──────────────────────────────────────────────────

class VendorProductCreate(BaseModel):
    title:           str = Field(min_length=2, max_length=255)
    sku:             str = Field(min_length=1, max_length=100)
    description:     str | None = None
    wholesale_price: Decimal = Field(gt=0, description="Price charged to platform")
    price:           Decimal = Field(gt=0, description="Suggested retail price")
    stock:           int = Field(ge=0, default=0)
    brand:           str | None = None
    category_id:     uuid.UUID | None = None
    images:          list[dict] = []
    variants:        dict = {}

    @model_validator(mode="after")
    def wholesale_less_than_retail(self) -> "VendorProductCreate":
        if self.wholesale_price >= self.price:
            raise ValueError("wholesale_price must be less than retail price")
        return self


class VendorProductUpdate(BaseModel):
    title:           str | None = None
    description:     str | None = None
    wholesale_price: Decimal | None = Field(default=None, gt=0)
    price:           Decimal | None = Field(default=None, gt=0)
    stock:           int | None = Field(default=None, ge=0)
    brand:           str | None = None
    images:          list[dict] | None = None
    variants:        dict | None = None
    status:          str | None = None  # draft | active | archived


class VendorProductOut(BaseModel):
    id:              uuid.UUID
    title:           str
    slug:            str
    sku:             str
    description:     str | None
    wholesale_price: Decimal | None
    price:           Decimal
    discount_price:  Decimal | None
    stock:           int
    available_stock: int
    brand:           str | None
    status:          str
    is_approved:     bool
    is_featured:     bool
    images:          list | None
    category_id:     uuid.UUID | None
    created_at:      datetime

    model_config = {"from_attributes": True}


# ── Vendor Orders ─────────────────────────────────────────────────────────────

class VendorOrderOut(BaseModel):
    id:              uuid.UUID
    order_id:        uuid.UUID
    status:          VendorOrderStatus
    wholesale_total: Decimal
    platform_margin: Decimal
    vendor_notes:    str | None
    created_at:      datetime
    updated_at:      datetime

    model_config = {"from_attributes": True}


class VendorOrderDetail(VendorOrderOut):
    shipment: "ShipmentOut | None"
    order_items: list[dict] = []   # populated in service layer

    model_config = {"from_attributes": True}


class VendorOrderAccept(BaseModel):
    notes: str | None = None


# ── Shipments ─────────────────────────────────────────────────────────────────

class ShipmentCreate(BaseModel):
    carrier_name:            str = Field(min_length=1, max_length=100)
    tracking_number:         str = Field(min_length=1, max_length=200)
    estimated_delivery_date: date | None = None
    notes:                   str | None = None


class ShipmentOut(BaseModel):
    id:                      uuid.UUID
    carrier_name:            str
    tracking_number:         str
    estimated_delivery_date: date | None
    notes:                   str | None
    shipped_at:              datetime | None
    delivered_at:            datetime | None

    model_config = {"from_attributes": True}


# ── Inventory ─────────────────────────────────────────────────────────────────

class StockUpdateRequest(BaseModel):
    quantity: int = Field(description="New absolute stock quantity (not a delta)", ge=0)
    notes:    str | None = None


class InventoryLogOut(BaseModel):
    id:              uuid.UUID
    product_id:      uuid.UUID
    change_quantity: int
    reason:          InventoryChangeReason
    previous_stock:  int
    new_stock:       int
    notes:           str | None
    created_at:      datetime

    model_config = {"from_attributes": True}


# ── Payouts ───────────────────────────────────────────────────────────────────

class PayoutOut(BaseModel):
    id:                uuid.UUID
    period_start:      date
    period_end:        date
    gross_amount:      Decimal
    deductions:        Decimal
    net_amount:        Decimal
    status:            PayoutStatus
    paid_at:           datetime | None
    payment_reference: str | None
    notes:             str | None
    created_at:        datetime

    model_config = {"from_attributes": True}


# ── Admin schemas ─────────────────────────────────────────────────────────────

class AdminVendorApprove(BaseModel):
    notes: str | None = None


class AdminVendorReject(BaseModel):
    reason: str = Field(min_length=10, description="Explain why the application was rejected")


class AdminVendorSuspend(BaseModel):
    reason: str = Field(min_length=5)


class AdminProductApprove(BaseModel):
    notes: str | None = None


class AdminProductReject(BaseModel):
    reason: str = Field(min_length=5)


class AdminPayoutCreate(BaseModel):
    vendor_id:    uuid.UUID
    period_start: date
    period_end:   date
    notes:        str | None = None


# ── Pagination wrapper ────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page:  int
    size:  int
    pages: int
