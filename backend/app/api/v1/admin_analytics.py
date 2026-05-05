"""
Analytics API endpoints for admin dashboard.
Provides sales, product, and user analytics.
"""
from datetime import datetime, timedelta
from decimal import Decimal

import structlog
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_admin_user
from app.db.session import get_db
from app.models.order import Order, OrderStatus
from app.models.product import Product, ProductStatus
from app.models.user import User, UserStatus
from app.schemas.analytics import (
    ProductAnalyticsResponse,
    SalesAnalyticsResponse,
    UserAnalyticsResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


def get_period_dates(period: str) -> tuple[datetime, datetime]:
    """Get start and end dates for a given period."""
    now = datetime.now()

    if period == "7d":
        start = now - timedelta(days=7)
    elif period == "30d":
        start = now - timedelta(days=30)
    elif period == "90d":
        start = now - timedelta(days=90)
    elif period == "1y":
        start = now - timedelta(days=365)
    else:
        start = now - timedelta(days=7)

    return start, now


@router.get("/sales", response_model=SalesAnalyticsResponse)
async def get_sales_analytics(
    period: str = Query("7d", regex="^(7d|30d|90d|1y)$"),
    current_user = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get sales analytics for the specified period."""
    start_date, end_date = get_period_dates(period)

    # Total revenue
    revenue_query = select(func.sum(Order.total)).where(
        and_(
            Order.status.in_([OrderStatus.paid, OrderStatus.processing, OrderStatus.shipped, OrderStatus.delivered]),
            Order.created_at >= start_date,
            Order.created_at <= end_date,
        )
    )
    revenue_result = await db.execute(revenue_query)
    total_revenue = revenue_result.scalar() or Decimal("0")

    # Total orders
    orders_query = select(func.count(Order.id)).where(
        and_(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
        )
    )
    orders_result = await db.execute(orders_query)
    total_orders = orders_result.scalar() or 0

    # Average order value
    average_order_value = total_revenue / total_orders if total_orders > 0 else Decimal("0")

    # Daily breakdown
    daily_query = select(
        func.date(Order.created_at).label("date"),
        func.sum(Order.total).label("revenue"),
        func.count(Order.id).label("orders"),
    ).where(
        and_(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
        )
    ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))

    daily_result = await db.execute(daily_query)
    daily_breakdown = [
        {
            "date": str(row.date),
            "revenue": float(row.revenue or 0),
            "orders": row.orders or 0,
        }
        for row in daily_result
    ]

    return SalesAnalyticsResponse(
        period=period,
        total_revenue=total_revenue,
        total_orders=total_orders,
        average_order_value=average_order_value,
        daily_breakdown=daily_breakdown,
    )


@router.get("/products", response_model=ProductAnalyticsResponse)
async def get_product_analytics(
    period: str = Query("7d", regex="^(7d|30d|90d|1y)$"),
    current_user = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get product analytics for the specified period."""
    start_date, end_date = get_period_dates(period)

    # Total products
    total_query = select(func.count(Product.id)).where(
        Product.status == ProductStatus.active
    )
    total_result = await db.execute(total_query)
    total_products = total_result.scalar() or 0

    # Out of stock
    oos_query = select(func.count(Product.id)).where(
        and_(
            Product.status == ProductStatus.active,
            Product.is_in_stock == False,
        )
    )
    oos_result = await db.execute(oos_query)
    out_of_stock_count = oos_result.scalar() or 0

    # Top products by revenue
    top_products_query = select(
        Product.id,
        Product.title,
        func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue"),
        func.sum(OrderItem.quantity).label("units_sold"),
    ).join(
        OrderItem, Product.id == OrderItem.product_id
    ).join(
        Order, OrderItem.order_id == Order.id
    ).where(
        and_(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.status.in_([OrderStatus.paid, OrderStatus.processing, OrderStatus.shipped, OrderStatus.delivered]),
        )
    ).group_by(Product.id, Product.title).order_by(
        func.sum(OrderItem.quantity * OrderItem.unit_price).desc()
    ).limit(10)

    from app.models.order import OrderItem
    top_products_result = await db.execute(top_products_query)
    top_products = [
        {
            "id": str(row.id),
            "title": row.title,
            "revenue": float(row.revenue or 0),
            "units_sold": row.units_sold or 0,
        }
        for row in top_products_result
    ]

    # Low stock products
    low_stock_query = select(
        Product.id,
        Product.title,
        Product.available_stock,
    ).where(
        and_(
            Product.status == ProductStatus.active,
            Product.available_stock > 0,
            Product.available_stock <= 10,
        )
    ).order_by(Product.available_stock.asc()).limit(10)

    low_stock_result = await db.execute(low_stock_query)
    low_stock_products = [
        {
            "id": str(row.id),
            "title": row.title,
            "available_stock": row.available_stock,
        }
        for row in low_stock_result
    ]

    return ProductAnalyticsResponse(
        period=period,
        top_products=top_products,
        low_stock_products=low_stock_products,
        total_products=total_products,
        out_of_stock_count=out_of_stock_count,
    )


@router.get("/users", response_model=UserAnalyticsResponse)
async def get_user_analytics(
    period: str = Query("7d", regex="^(7d|30d|90d|1y)$"),
    current_user = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user analytics for the specified period."""
    start_date, end_date = get_period_dates(period)

    # Total users
    total_query = select(func.count(User.id)).where(
        User.status == UserStatus.active
    )
    total_result = await db.execute(total_query)
    total_users = total_result.scalar() or 0

    # New users in period
    new_users_query = select(func.count(User.id)).where(
        and_(
            User.created_at >= start_date,
            User.created_at <= end_date,
        )
    )
    new_users_result = await db.execute(new_users_query)
    new_users = new_users_result.scalar() or 0

    # Active users (users with orders in period)
    active_users_query = select(func.count(func.distinct(Order.user_id))).where(
        and_(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
        )
    )
    active_users_result = await db.execute(active_users_query)
    active_users = active_users_result.scalar() or 0

    # Daily breakdown
    daily_query = select(
        func.date(User.created_at).label("date"),
        func.count(User.id).label("new_users"),
    ).where(
        and_(
            User.created_at >= start_date,
            User.created_at <= end_date,
        )
    ).group_by(func.date(User.created_at)).order_by(func.date(User.created_at))

    daily_result = await db.execute(daily_query)
    daily_breakdown = [
        {
            "date": str(row.date),
            "new_users": row.new_users or 0,
        }
        for row in daily_result
    ]

    return UserAnalyticsResponse(
        period=period,
        total_users=total_users,
        new_users=new_users,
        active_users=active_users,
        daily_breakdown=daily_breakdown,
    )
