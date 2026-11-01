"""Pydantic Schemas Registry."""

from app.schemas.common import PaginatedResponse, MessageResponse, ErrorResponse

__all__ = [
    "PaginatedResponse",
    "MessageResponse",
    "ErrorResponse",
]
