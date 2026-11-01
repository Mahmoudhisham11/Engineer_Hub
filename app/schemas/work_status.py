"""WorkStatus Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import Field
from app.schemas.common import BaseSchema


class WorkStatusBase(BaseSchema):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: bool = True


class WorkStatusCreate(WorkStatusBase):
    pass


class WorkStatusUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class WorkStatusResponse(BaseSchema):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class WorkStatusSimpleResponse(BaseSchema):
    id: int
    name: str
