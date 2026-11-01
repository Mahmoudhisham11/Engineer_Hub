"""WorkType Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import Field
from app.schemas.common import BaseSchema


class WorkTypeBase(BaseSchema):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: bool = True


class WorkTypeCreate(WorkTypeBase):
    pass


class WorkTypeUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class WorkTypeResponse(BaseSchema):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class WorkTypeSimpleResponse(BaseSchema):
    id: int
    name: str
