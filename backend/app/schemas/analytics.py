"""Analytics schemas for API requests and responses."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class SalesAnalyticsResponse(BaseModel):
    """Schema for sales analytics response."""
    period: str
    total_revenue: Decimal
    total_orders: int
    average_order_value: Decimal
    conversion_rate: Optional[float] = None
    daily_breakdown: list[dict]


class ProductAnalyticsResponse(BaseModel):
    """Schema for product analytics response."""
    period: str
    top_products: list[dict]
    low_stock_products: list[dict]
    total_products: int
    out_of_stock_count: int


class UserAnalyticsResponse(BaseModel):
    """Schema for user analytics response."""
    period: str
    total_users: int
    new_users: int
    active_users: int
    user_growth_rate: Optional[float] = None
    daily_breakdown: list[dict]


class AnalyticsPeriodRequest(BaseModel):
    """Schema for analytics period request."""
    period: str = "7d"  # 7d, 30d, 90d, 1y
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
