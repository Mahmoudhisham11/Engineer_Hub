"""WorkLog Pydantic Schemas."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import Field
from app.schemas.common import BaseSchema
from app.schemas.engineer import EngineerSimpleResponse
from app.schemas.project import ProjectSimpleResponse
from app.schemas.work_status import WorkStatusSimpleResponse
from app.schemas.work_type import WorkTypeSimpleResponse


class WorkLogBase(BaseSchema):
    work_date: date
    project_id: int = Field(..., gt=0)
    hours: Decimal = Field(..., gt=0, le=24, max_digits=4, decimal_places=2)
    work_type_id: int = Field(..., gt=0)
    work_status_id: int = Field(..., gt=0)
    notes: Optional[str] = None


class WorkLogCreate(WorkLogBase):
    pass


class WorkLogAdminCreate(WorkLogBase):
    engineer_id: int = Field(..., gt=0)


class WorkLogUpdate(BaseSchema):
    work_date: Optional[date] = None
    project_id: Optional[int] = Field(None, gt=0)
    hours: Optional[Decimal] = Field(None, gt=0, le=24, max_digits=4, decimal_places=2)
    work_type_id: Optional[int] = Field(None, gt=0)
    work_status_id: Optional[int] = Field(None, gt=0)
    notes: Optional[str] = None


class WorkLogResponse(BaseSchema):
    id: int
    engineer_id: int
    work_date: date
    project_id: int
    hours: Decimal
    work_type_id: int
    work_status_id: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    engineer: Optional[EngineerSimpleResponse] = None
    project: Optional[ProjectSimpleResponse] = None
    work_type: Optional[WorkTypeSimpleResponse] = None
    work_status: Optional[WorkStatusSimpleResponse] = None
