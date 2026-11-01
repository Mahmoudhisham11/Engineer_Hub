"""Project Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import Field
from app.schemas.common import BaseSchema


class ProjectBase(BaseSchema):
    name: str = Field(..., min_length=2, max_length=150)
    project_code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    is_active: bool = True


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    project_code: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProjectResponse(BaseSchema):
    id: int
    name: str
    project_code: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProjectSimpleResponse(BaseSchema):
    id: int
    name: str
    project_code: str
