"""
Reusable pagination schema and helper.
All list endpoints use this to keep the response shape consistent.
"""
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="1-based page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PagedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    pages: int

    @classmethod
    def create(
        cls,
        items: list[T],
        total: int,
        params: PaginationParams,
    ) -> "PagedResponse[T]":
        import math
        return cls(
            items=items,
            total=total,
            page=params.page,
            limit=params.limit,
            pages=math.ceil(total / params.limit) if total > 0 else 0,
        )
