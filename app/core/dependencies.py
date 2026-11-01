"""FastAPI Request Dependencies for Auth, Roles, and Database Sessions."""

from typing import Generator, Optional
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.core.security import decode_access_token
from app.models.engineer import Engineer
from app.models.user import User, UserRole
from app.utils.pagination import PaginationParams

security_bearer = HTTPBearer(auto_error=False)


def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP from headers or direct connection."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Validate Bearer JWT and retrieve User."""
    if not auth or not auth.credentials:
        raise AuthenticationError("Authentication token is missing.")

    payload = decode_access_token(auth.credentials)
    if not payload:
        raise AuthenticationError("Invalid or expired authentication token.")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("Malformed token payload.")

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise AuthenticationError("Malformed token subject.")

    user = db.get(User, user_id)
    if not user:
        raise AuthenticationError("User associated with this token no longer exists.")

    if not user.is_active:
        raise PermissionDeniedError("Your user account has been deactivated.")

    return user


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Enforce ADMIN role."""
    if current_user.role != UserRole.ADMIN:
        raise PermissionDeniedError("Administrative privileges are required for this action.")
    return current_user


def require_engineer(
    current_user: User = Depends(get_current_user),
) -> User:
    """Enforce ENGINEER role."""
    if current_user.role != UserRole.ENGINEER:
        raise PermissionDeniedError("Engineer access required for this action.")
    return current_user


def get_current_engineer(
    current_user: User = Depends(require_engineer),
    db: Session = Depends(get_db),
) -> Engineer:
    """Retrieve the Engineer profile associated with the current user."""
    from app.services.engineer_service import engineer_service
    engineer = engineer_service.get_by_user_id(db, current_user.id)
    if not engineer.is_active:
        raise PermissionDeniedError("Your engineer profile has been deactivated.")
    return engineer


def get_pagination(
    page: int = 1,
    page_size: int = 25,
) -> PaginationParams:
    """Pagination query params dependency."""
    return PaginationParams(page=page, page_size=page_size)
