"""Vendor profile & onboarding endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.vendor import VendorDetail, VendorOnboardingRequest, VendorUpdateRequest
from app.api.v1.vendor.deps import get_current_vendor_user

router = APIRouter(prefix="/vendor", tags=["Vendor Profile"])


@router.get("/me", response_model=VendorDetail)
async def get_my_vendor(
    pair: tuple[User, Vendor] = Depends(get_current_vendor_user),
):
    _, vendor = pair
    return vendor


@router.post("/onboarding", response_model=VendorDetail)
async def complete_onboarding(
    body: VendorOnboardingRequest,
    pair: tuple[User, Vendor] = Depends(get_current_vendor_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2: vendor fills in business/warehouse address and bank details.
    Can be called multiple times (idempotent update).
    """
    _, vendor = pair
    for field, val in body.model_dump(exclude_none=True).items():
        if isinstance(val, object) and hasattr(val, "model_dump"):
            setattr(vendor, field, val.model_dump())
        else:
            setattr(vendor, field, val)
    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.patch("/me", response_model=VendorDetail)
async def update_profile(
    body: VendorUpdateRequest,
    pair: tuple[User, Vendor] = Depends(get_current_vendor_user),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    for field, val in body.model_dump(exclude_none=True).items():
        if isinstance(val, object) and hasattr(val, "model_dump"):
            setattr(vendor, field, val.model_dump())
        else:
            setattr(vendor, field, val)
    await db.commit()
    await db.refresh(vendor)
    return vendor
