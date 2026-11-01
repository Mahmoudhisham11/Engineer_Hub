"""Authentication Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import Field
from app.models.user import UserRole
from app.schemas.common import BaseSchema
from app.schemas.engineer import EngineerResponse
from app.schemas.user import UserResponse


class LoginRequest(BaseSchema):
    username_or_email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=100)


class TokenPayload(BaseSchema):
    sub: str
    role: str
    exp: datetime
    iat: Optional[datetime] = None


class UserProfileResponse(BaseSchema):
    user: UserResponse
    engineer: Optional[EngineerResponse] = None


class Token(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    engineer: Optional[EngineerResponse] = None


class ChangePasswordRequest(BaseSchema):
    current_password: str = Field(..., min_length=1, max_length=100)
    new_password: str = Field(..., min_length=6, max_length=100)


class AdminResetPasswordRequest(BaseSchema):
    new_password: str = Field(..., min_length=6, max_length=100)
