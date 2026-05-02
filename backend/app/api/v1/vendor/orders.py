"""
Vendor order management endpoints.
Vendors see only their own VendorOrder slices — never full order details.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.vendor import Shipment, Vendor, VendorOrder, VendorOrderStatus
from app.models.user import User
from app.schemas.vendor import (
    ShipmentCreate, ShipmentOut,
    VendorOrderAccept, VendorOrderDetail, VendorOrderOut,
)
from app.api.v1.vendor.deps import require_approved_vendor

router = APIRouter(prefix="/vendor/orders", tags=["Vendor Orders"])

_VALID_TRANSITIONS: dict[VendorOrderStatus, list[VendorOrderStatus]] = {
    VendorOrderStatus.new:             [VendorOrderStatus.vendor_accepted, VendorOrderStatus.cancelled],
    VendorOrderStatus.sent_to_vendor:  [VendorOrderStatus.vendor_accepted, VendorOrderStatus.cancelled],
    VendorOrderStatus.vendor_accepted: [VendorOrderStatus.processing],
    VendorOrderStatus.processing:      [VendorOrderStatus.shipped],
    VendorOrderStatus.shipped:         [VendorOrderStatus.delivered],
    VendorOrderStatus.delivered:       [],
    VendorOrderStatus.cancelled:       [],
}


def _assert_transition(current: VendorOrderStatus, target: VendorOrderStatus) -> None:
    if target not in _VALID_TRANSITIONS.get(current, []):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot transition from '{current}' to '{target}'",
        )


@router.get("", response_model=list[VendorOrderOut])
async def list_vendor_orders(
    order_status: VendorOrderStatus | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    q = select(VendorOrder).where(VendorOrder.vendor_id == vendor.id)
    if order_status:
        q = q.where(VendorOrder.status == order_status)
    q = q.order_by(VendorOrder.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{vendor_order_id}", response_model=VendorOrderDetail)
async def get_vendor_order(
    vendor_order_id: uuid.UUID,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    result = await db.execute(
        select(VendorOrder)
        .where(VendorOrder.id == vendor_order_id, VendorOrder.vendor_id == vendor.id)
        .options(selectinload(VendorOrder.shipment))
    )
    vo = result.scalar_one_or_none()
    if not vo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor order not found")
    return vo


@router.post("/{vendor_order_id}/accept", response_model=VendorOrderOut)
async def accept_order(
    vendor_order_id: uuid.UUID,
    body: VendorOrderAccept,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    vo = await db.scalar(
        select(VendorOrder).where(VendorOrder.id == vendor_order_id, VendorOrder.vendor_id == vendor.id)
    )
    if not vo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor order not found")
    _assert_transition(vo.status, VendorOrderStatus.vendor_accepted)
    vo.status = VendorOrderStatus.vendor_accepted
    if body.notes:
        vo.vendor_notes = body.notes
    await db.commit()
    await db.refresh(vo)
    return vo


@router.post("/{vendor_order_id}/process", response_model=VendorOrderOut)
async def mark_processing(
    vendor_order_id: uuid.UUID,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    vo = await db.scalar(
        select(VendorOrder).where(VendorOrder.id == vendor_order_id, VendorOrder.vendor_id == vendor.id)
    )
    if not vo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor order not found")
    _assert_transition(vo.status, VendorOrderStatus.processing)
    vo.status = VendorOrderStatus.processing
    await db.commit()
    await db.refresh(vo)
    return vo


@router.post("/{vendor_order_id}/ship", response_model=VendorOrderOut)
async def ship_order(
    vendor_order_id: uuid.UUID,
    body: ShipmentCreate,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    """Mark the vendor order as shipped and record tracking info."""
    _, vendor = pair
    vo = await db.scalar(
        select(VendorOrder).where(VendorOrder.id == vendor_order_id, VendorOrder.vendor_id == vendor.id)
    )
    if not vo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor order not found")
    _assert_transition(vo.status, VendorOrderStatus.shipped)

    # Create shipment record
    shipment = Shipment(
        vendor_order_id=vo.id,
        carrier_name=body.carrier_name,
        tracking_number=body.tracking_number,
        estimated_delivery_date=body.estimated_delivery_date,
        notes=body.notes,
        shipped_at=datetime.now(timezone.utc),
    )
    db.add(shipment)

    vo.status = VendorOrderStatus.shipped
    await db.commit()
    await db.refresh(vo)
    return vo


@router.post("/{vendor_order_id}/deliver", response_model=VendorOrderOut)
async def mark_delivered(
    vendor_order_id: uuid.UUID,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    vo = await db.scalar(
        select(VendorOrder).where(VendorOrder.id == vendor_order_id, VendorOrder.vendor_id == vendor.id)
    )
    if not vo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor order not found")
    _assert_transition(vo.status, VendorOrderStatus.delivered)

    # Mark shipment delivered
    result = await db.execute(select(Shipment).where(Shipment.vendor_order_id == vo.id))
    shipment = result.scalar_one_or_none()
    if shipment:
        shipment.delivered_at = datetime.now(timezone.utc)

    vo.status = VendorOrderStatus.delivered
    await db.commit()
    await db.refresh(vo)
    return vo


@router.get("/{vendor_order_id}/shipment", response_model=ShipmentOut)
async def get_shipment(
    vendor_order_id: uuid.UUID,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    vo = await db.scalar(
        select(VendorOrder).where(VendorOrder.id == vendor_order_id, VendorOrder.vendor_id == vendor.id)
    )
    if not vo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vendor order not found")

    result = await db.execute(select(Shipment).where(Shipment.vendor_order_id == vo.id))
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No shipment recorded yet")
    return shipment
