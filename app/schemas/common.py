"""Common reusable Pydantic schemas."""

from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseSchema, Generic[T]):
    items: List[T]
    page: int = Field(..., json_schema_extra={"example": 1})
    page_size: int = Field(..., json_schema_extra={"example": 25})
    total: int = Field(..., json_schema_extra={"example": 100})
    total_pages: int = Field(..., json_schema_extra={"example": 4})


class MessageResponse(BaseSchema):
    success: bool = True
    message: str


class ErrorResponse(BaseSchema):
    success: bool = False
    message: str
    code: str = "ERROR"
    details: Optional[Any] = None
