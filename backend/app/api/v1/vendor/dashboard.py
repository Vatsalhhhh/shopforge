"""GET /api/v1/vendor/dashboard — vendor stats overview."""
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.product import Product, ProductStatus
from app.models.vendor import Payout, PayoutStatus, VendorOrder, VendorOrderStatus
from app.schemas.vendor import VendorDashboard
from app.api.v1.vendor.deps import get_current_vendor_user
from app.models.user import User
from app.models.vendor import Vendor

router = APIRouter(prefix="/vendor", tags=["Vendor Dashboard"])

LOW_STOCK_THRESHOLD = 5


@router.get("/dashboard", response_model=VendorDashboard)
async def get_dashboard(
    pair: tuple[User, Vendor] = Depends(get_current_vendor_user),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair

    # Order counts
    total_orders = await db.scalar(
        select(func.count()).where(VendorOrder.vendor_id == vendor.id)
    ) or 0

    pending_orders = await db.scalar(
        select(func.count()).where(
            VendorOrder.vendor_id == vendor.id,
            VendorOrder.status.in_([VendorOrderStatus.new, VendorOrderStatus.sent_to_vendor, VendorOrderStatus.vendor_accepted]),
        )
    ) or 0

    shipped_orders = await db.scalar(
        select(func.count()).where(
            VendorOrder.vendor_id == vendor.id,
            VendorOrder.status == VendorOrderStatus.shipped,
        )
    ) or 0

    delivered_orders = await db.scalar(
        select(func.count()).where(
            VendorOrder.vendor_id == vendor.id,
            VendorOrder.status == VendorOrderStatus.delivered,
        )
    ) or 0

    # Pending payout = sum of wholesale_total for delivered vendor_orders not yet paid
    pending_payout = await db.scalar(
        select(func.coalesce(func.sum(VendorOrder.wholesale_total), 0)).where(
            VendorOrder.vendor_id == vendor.id,
            VendorOrder.status == VendorOrderStatus.delivered,
            VendorOrder.payout_id.is_(None),
        )
    ) or Decimal("0.00")

    # Low stock products
    low_stock_count = await db.scalar(
        select(func.count()).where(
            Product.vendor_id == vendor.id,
            Product.stock <= LOW_STOCK_THRESHOLD,
            Product.status == ProductStatus.active,
        )
    ) or 0

    return VendorDashboard(
        total_orders=total_orders,
        pending_orders=pending_orders,
        shipped_orders=shipped_orders,
        delivered_orders=delivered_orders,
        total_revenue=vendor.total_revenue,
        pending_payout=Decimal(str(pending_payout)),
        low_stock_count=low_stock_count,
        rating=float(vendor.rating) if vendor.rating else None,
        vendor_status=vendor.status,
    )
