"""
Vendor product management endpoints.
Vendors manage their own products; admin must approve before they go live.
"""
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.product import Product, ProductStatus
from app.models.vendor import InventoryChangeReason, InventoryLog, Vendor, VendorStatus
from app.models.user import User
from app.schemas.vendor import (
    InventoryLogOut, StockUpdateRequest,
    VendorProductCreate, VendorProductOut, VendorProductUpdate,
)
from app.api.v1.vendor.deps import require_approved_vendor
from app.utils.slugify import make_slug

router = APIRouter(prefix="/vendor/products", tags=["Vendor Products"])


def _check_owns_product(product: Product, vendor: Vendor) -> None:
    if product.vendor_id != vendor.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")


@router.get("", response_model=list[VendorProductOut])
async def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    offset = (page - 1) * size
    result = await db.execute(
        select(Product).where(Product.vendor_id == vendor.id).offset(offset).limit(size)
    )
    return result.scalars().all()


@router.post("", response_model=VendorProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: VendorProductCreate,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair

    # SKU uniqueness check
    existing = await db.scalar(select(Product).where(Product.sku == body.sku))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"SKU '{body.sku}' already exists")

    slug = make_slug(body.title)
    # Ensure slug uniqueness
    slug_count = await db.scalar(select(func.count()).where(Product.slug.like(f"{slug}%")))
    if slug_count:
        slug = f"{slug}-{slug_count + 1}"

    product = Product(
        title=body.title,
        slug=slug,
        sku=body.sku,
        description=body.description,
        price=body.price,
        wholesale_price=body.wholesale_price,
        stock=body.stock,
        brand=body.brand,
        category_id=body.category_id,
        images=body.images,
        variants=body.variants,
        status=ProductStatus.draft,   # draft until approved
        is_approved=False,            # requires admin approval
        vendor_id=vendor.id,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/{product_id}", response_model=VendorProductOut)
async def get_product(
    product_id: uuid.UUID,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    _check_owns_product(product, vendor)
    return product


@router.patch("/{product_id}", response_model=VendorProductOut)
async def update_product(
    product_id: uuid.UUID,
    body: VendorProductUpdate,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    _check_owns_product(product, vendor)

    for field, val in body.model_dump(exclude_none=True).items():
        if field == "status":
            # Vendor can only set draft/archived — not active (requires approval)
            if val == "active" and not product.is_approved:
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Product must be approved by admin before activating")
            setattr(product, field, ProductStatus(val))
        else:
            setattr(product, field, val)

    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disable_product(
    product_id: uuid.UUID,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    _check_owns_product(product, vendor)
    product.status = ProductStatus.archived
    await db.commit()


# ── Stock management ──────────────────────────────────────────────────────────

@router.patch("/{product_id}/stock", response_model=VendorProductOut)
async def update_stock(
    product_id: uuid.UUID,
    body: StockUpdateRequest,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    _check_owns_product(product, vendor)

    previous = product.stock
    delta = body.quantity - previous

    product.stock = body.quantity

    log = InventoryLog(
        product_id=product.id,
        vendor_id=vendor.id,
        change_quantity=delta,
        reason=InventoryChangeReason.restock if delta >= 0 else InventoryChangeReason.adjustment,
        previous_stock=previous,
        new_stock=body.quantity,
        notes=body.notes,
    )
    db.add(log)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/{product_id}/inventory-logs", response_model=list[InventoryLogOut])
async def get_inventory_logs(
    product_id: uuid.UUID,
    pair: tuple[User, Vendor] = Depends(require_approved_vendor),
    db: AsyncSession = Depends(get_db),
):
    _, vendor = pair
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    _check_owns_product(product, vendor)

    result = await db.execute(
        select(InventoryLog)
        .where(InventoryLog.product_id == product_id)
        .order_by(InventoryLog.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()
