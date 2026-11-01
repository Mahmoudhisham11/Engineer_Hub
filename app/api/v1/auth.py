"""Authentication API endpoints."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_client_ip, get_current_user
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    Token,
    UserProfileResponse,
)
from app.schemas.common import MessageResponse
from app.schemas.engineer import EngineerResponse
from app.schemas.user import UserResponse
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token, summary="User login and JWT token issuance")
def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate with username or email and password."""
    client_ip = get_client_ip(request)
    user, engineer, token = auth_service.authenticate_user(
        db=db,
        username_or_email=body.username_or_email,
        password=body.password,
        ip_address=client_ip,
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        engineer=EngineerResponse.model_validate(engineer) if engineer else None,
    )


@router.post("/logout", response_model=MessageResponse, summary="User logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log out current user and record audit log."""
    client_ip = get_client_ip(request)
    audit_service.log(
        db=db,
        action="LOGOUT",
        user_id=current_user.id,
        entity_type="User",
        entity_id=current_user.id,
        ip_address=client_ip,
    )
    db.commit()
    return MessageResponse(success=True, message="Successfully logged out.")


@router.get("/me", response_model=UserProfileResponse, summary="Get current logged in user profile")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get profile information of currently authenticated user."""
    user, engineer = auth_service.get_user_profile(db, current_user.id)
    return UserProfileResponse(
        user=UserResponse.model_validate(user),
        engineer=EngineerResponse.model_validate(engineer) if engineer else None,
    )


@router.put("/change-password", response_model=MessageResponse, summary="Change current user's password")
def change_password(
    request: Request,
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Self-service password change for logged-in user."""
    client_ip = get_client_ip(request)
    auth_service.change_password(
        db=db,
        user=current_user,
        current_password=body.current_password,
        new_password=body.new_password,
        ip_address=client_ip,
    )
    return MessageResponse(success=True, message="Password updated successfully.")
