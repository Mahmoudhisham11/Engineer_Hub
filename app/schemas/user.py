"""User Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import EmailStr, Field
from app.models.user import UserRole
from app.schemas.common import BaseSchema


class UserBase(BaseSchema):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole = UserRole.ENGINEER
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserUpdate(BaseSchema):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class UserResponse(BaseSchema):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class UserSimpleResponse(BaseSchema):
    id: int
    username: str
    email: str
    role: UserRole
