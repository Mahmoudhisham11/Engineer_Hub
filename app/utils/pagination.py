"""Pagination helper functions and parameters."""

import math
from typing import Generic, List, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams:
    """Query parameters for pagination."""

    def __init__(
        self,
        page: int = 1,
        page_size: int = 25,
    ):
        self.page = max(1, page)
        self.page_size = min(max(1, page_size), 100)  # capped at 100 per page

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def paginate_list(items: List[T], total: int, page: int, page_size: int) -> dict:
    """Construct standard pagination response dictionary."""
    total_pages = math.ceil(total / page_size) if page_size > 0 else 0
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }
