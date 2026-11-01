"""Engineer Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import EmailStr, Field
from app.models.user import UserRole
from app.schemas.common import BaseSchema
from app.schemas.department import DepartmentSimpleResponse
from app.schemas.user import UserSimpleResponse


class EngineerBase(BaseSchema):
    employee_code: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=150)
    department_id: int = Field(..., gt=0)
    is_active: bool = True


class EngineerCreate(BaseSchema):
    # User creation payload bundled with engineer details
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    employee_code: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=150)
    department_id: int = Field(..., gt=0)
    role: UserRole = UserRole.ENGINEER
    is_active: bool = True


class EngineerUpdate(BaseSchema):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    department_id: Optional[int] = Field(None, gt=0)
    employee_code: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class EngineerRoleUpdate(BaseSchema):
    role: UserRole


class EngineerSelfUpdate(BaseSchema):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)


class EngineerResponse(BaseSchema):
    id: int
    user_id: int
    employee_code: str
    full_name: str
    department_id: int
    department: Optional[DepartmentSimpleResponse] = None
    user: Optional[UserSimpleResponse] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class EngineerSimpleResponse(BaseSchema):
    id: int
    employee_code: str
    full_name: str
    department_id: int
