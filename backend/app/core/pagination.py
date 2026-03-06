"""Pagination helper for all routers."""
from typing import TypeVar, Generic, List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session, Query
import math


T = TypeVar("T")


class PaginatedResponse(BaseModel):
    """Standard paginated response format expected by frontend."""
    data: list
    total: int
    page: int
    limit: int
    totalPages: int


def paginate(
    query: Query,
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    search_fields: list = None,
    model=None,
    status_filter: Optional[str] = None,
    status_field: str = "status",
    extra_filters: dict = None,
) -> dict:
    """
    Apply pagination, search, and filters to a SQLAlchemy query.
    Returns dict matching PaginatedResponse format.
    """
    from sqlalchemy import or_

    # Apply search filter
    if search and search_fields and model:
        search_conditions = []
        for field_name in search_fields:
            field = getattr(model, field_name, None)
            if field is not None:
                search_conditions.append(field.ilike(f"%{search}%"))
        if search_conditions:
            query = query.filter(or_(*search_conditions))

    # Apply status filter
    if status_filter and model:
        field = getattr(model, status_field, None)
        if field is not None:
            query = query.filter(field == status_filter)

    # Apply extra filters
    if extra_filters and model:
        for field_name, value in extra_filters.items():
            if value is not None:
                field = getattr(model, field_name, None)
                if field is not None:
                    query = query.filter(field == value)

    # Get total count
    total = query.count()

    # Calculate pagination
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    offset = (page - 1) * limit

    # Get paginated data
    items = query.offset(offset).limit(limit).all()

    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages,
    }
