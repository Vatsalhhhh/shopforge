"""
Admin endpoints for vendor and product approval.
All routes require role=admin JWT.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.product import Product, ProductStatus
from app.models.user import User
from app.models.vendor import (
    Payout, PayoutStatus, Vendor, VendorOrder,
    VendorOrderStatus, VendorStatus,
)
from app.schemas.vendor import (
    AdminPayoutCreate, AdminProductApprove, AdminProductReject,
    AdminVendorApprove, AdminVendorReject, AdminVendorSuspend,
    PayoutOut, VendorDetail, VendorProductOut, VendorSummary,
)
from app.api.v1.vendor.deps import get_current_admin

router = APIRouter(prefix="/admin/vendors", tags=["Admin — Vendors"])


# ── Vendor management ─────────────────────────────────────────────────────────

@router.get("", response_model=list[VendorSummary])
async def list_vendors(
    vendor_status: VendorStatus | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(Vendor)
    if vendor_status:
        q = q.where(Vendor.status == vendor_status)
    q = q.order_by(Vendor.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{vendor_id}", response_model=VendorDetail)
async def get_vendor(
    vendor_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return vendor


@router.post("/{vendor_id}/approve", response_model=VendorDetail)
async def approve_vendor(
    vendor_id: uuid.UUID,
    body: AdminVendorApprove,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    if vendor.status == VendorStatus.approved:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Already approved")

    vendor.status = VendorStatus.approved
    vendor.approved_at = datetime.now(timezone.utc)
    vendor.approved_by_id = admin.id
    if body.notes:
        vendor.admin_notes = body.notes

    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.post("/{vendor_id}/reject", response_model=VendorDetail)
async def reject_vendor(
    vendor_id: uuid.UUID,
    body: AdminVendorReject,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    vendor.status = VendorStatus.rejected
    vendor.rejected_reason = body.reason
    vendor.approved_by_id = admin.id
    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.post("/{vendor_id}/suspend", response_model=VendorDetail)
async def suspend_vendor(
    vendor_id: uuid.UUID,
    body: AdminVendorSuspend,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    vendor.status = VendorStatus.suspended
    vendor.admin_notes = body.reason
    await db.commit()
    await db.refresh(vendor)
    return vendor


# ── Product approval ──────────────────────────────────────────────────────────

@router.get("/{vendor_id}/products", response_model=list[VendorProductOut])
async def list_vendor_products(
    vendor_id: uuid.UUID,
    is_approved: bool | None = None,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(Product).where(Product.vendor_id == vendor_id)
    if is_approved is not None:
        q = q.where(Product.is_approved == is_approved)
    result = await db.execute(q.order_by(Product.created_at.desc()))
    return result.scalars().all()


@router.post("/products/{product_id}/approve", response_model=VendorProductOut)
async def approve_product(
    product_id: uuid.UUID,
    body: AdminProductApprove,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product or not product.vendor_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor product not found")

    product.is_approved = True
    product.status = ProductStatus.active
    await db.commit()
    await db.refresh(product)
    return product


@router.post("/products/{product_id}/reject", response_model=VendorProductOut)
async def reject_product(
    product_id: uuid.UUID,
    body: AdminProductReject,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product or not product.vendor_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor product not found")

    product.is_approved = False
    product.status = ProductStatus.draft
    # Store rejection reason in metadata
    meta = product.metadata_ or {}
    meta["rejection_reason"] = body.reason
    product.metadata_ = meta
    await db.commit()
    await db.refresh(product)
    return product


# ── Payout management ─────────────────────────────────────────────────────────

@router.post("/payouts", response_model=PayoutOut, status_code=status.HTTP_201_CREATED)
async def create_payout(
    body: AdminPayoutCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin creates a payout for a vendor covering a date range.
    Automatically sums wholesale_total from delivered vendor_orders in the period.
    """
    vendor = await db.get(Vendor, body.vendor_id)
    if not vendor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    # Sum unpaid delivered orders in the period
    gross = await db.scalar(
        select(func.coalesce(func.sum(VendorOrder.wholesale_total), 0)).where(
            VendorOrder.vendor_id == body.vendor_id,
            VendorOrder.status == VendorOrderStatus.delivered,
            VendorOrder.payout_id.is_(None),
        )
    ) or Decimal("0.00")

    payout = Payout(
        vendor_id=body.vendor_id,
        period_start=body.period_start,
        period_end=body.period_end,
        gross_amount=Decimal(str(gross)),
        deductions=Decimal("0.00"),
        net_amount=Decimal(str(gross)),
        status=PayoutStatus.pending,
        notes=body.notes,
    )
    db.add(payout)
    await db.flush()

    # Link vendor orders to this payout
    result = await db.execute(
        select(VendorOrder).where(
            VendorOrder.vendor_id == body.vendor_id,
            VendorOrder.status == VendorOrderStatus.delivered,
            VendorOrder.payout_id.is_(None),
        )
    )
    for vo in result.scalars().all():
        vo.payout_id = payout.id

    await db.commit()
    await db.refresh(payout)
    return payout


@router.patch("/payouts/{payout_id}/mark-paid", response_model=PayoutOut)
async def mark_payout_paid(
    payout_id: uuid.UUID,
    payment_reference: str,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    payout = await db.get(Payout, payout_id)
    if not payout:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payout not found")

    payout.status = PayoutStatus.paid
    payout.paid_at = datetime.now(timezone.utc)
    payout.payment_reference = payment_reference
    await db.commit()
    await db.refresh(payout)
    return payout
