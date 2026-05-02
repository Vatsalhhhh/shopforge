"""GET /api/v1/vendor/payouts — vendor payout history."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.vendor import Payout, Vendor
from app.models.user import User
from app.schemas.vendor import PayoutOut
from app.api.v1.vendor.deps import require_approved_vendor

router = APIRouter(prefix="/vendor/payouts", tags=["Vendor Payouts"])


@router.get("", response_model=list[PayoutOut])
async def list_payouts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    result = await db.execute(
        select(Payout)
        .where(Payout.vendor_id == vendor.id)
        .order_by(Payout.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    return result.scalars().all()


@router.get("/{payout_id}", response_model=PayoutOut)
async def get_payout(
    payout_id: uuid.UUID,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    payout = await db.scalar(
        select(Payout).where(Payout.id == payout_id, Payout.vendor_id == vendor.id)
    )
    if not payout:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payout not found")
    return payout
