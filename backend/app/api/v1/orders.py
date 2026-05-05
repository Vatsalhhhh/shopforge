"""
Order API endpoints for customers.
Provides order listing, details, and cancellation functionality.
"""
from datetime import datetime
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.schemas.order import (
    OrderCancelRequest,
    OrderCancelResponse,
    OrderListResponse,
    OrderResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("", response_model=OrderListResponse)
async def list_orders(
    status_filter: Optional[str] = Query(None, description="Filter by order status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List user's orders with pagination.

    Only returns orders belonging to the current user.
    """
    # Build base query
    query = select(Order).where(Order.user_id == current_user.id)

    # Apply status filter
    if status_filter:
        try:
            order_status = OrderStatus(status_filter)
            query = query.where(Order.status == order_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}",
            )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply sorting and pagination
    query = query.order_by(Order.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    # Execute query with items
    query = query.options(selectinload(Order.items))
    result = await db.execute(query)
    orders = result.scalars().all()

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return OrderListResponse(
        items=orders,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get order details.

    Only returns orders belonging to the current user.
    """
    query = (
        select(Order)
        .where(
            and_(
                Order.id == order_id,
                Order.user_id == current_user.id,
            )
        )
        .options(selectinload(Order.items))
    )

    result = await db.execute(query)
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order


@router.post("/{order_id}/cancel", response_model=OrderCancelResponse)
async def cancel_order(
    order_id: str,
    cancel_request: OrderCancelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel an order.

    Only orders in 'pending' or 'paid' status can be cancelled.
    """
    # Get order
    query = select(Order).where(
        and_(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    # Check if order can be cancelled
    if order.status not in [OrderStatus.pending, OrderStatus.paid]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order in '{order.status}' status",
        )

    # Update order status
    order.status = OrderStatus.cancelled
    order.notes = f"Cancelled by user. Reason: {cancel_request.reason}" if cancel_request.reason else "Cancelled by user"

    await db.commit()
    await db.refresh(order)

    logger.info(
        "Order cancelled",
        user_id=current_user.id,
        order_id=order_id,
        reason=cancel_request.reason,
    )

    return OrderCancelResponse(
        id=order.id,
        status=order.status,
        cancelled_at=datetime.now(),
        cancellation_reason=cancel_request.reason,
    )
