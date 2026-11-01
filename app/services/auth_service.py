"""Authentication and authorization service."""

from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from app.core.exceptions import AuthenticationError, ConflictError, NotFoundError, PermissionDeniedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.engineer import Engineer
from app.models.user import User, UserRole
from app.services.audit_service import audit_service


class AuthService:
    @staticmethod
    def authenticate_user(
        db: Session,
        username_or_email: str,
        password: str,
        ip_address: Optional[str] = None,
    ) -> Tuple[User, Optional[Engineer], str]:
        """Authenticate user by username or email and return JWT access token."""
        stmt = select(User).where(
            or_(
                User.username == username_or_email.strip(),
                User.email == username_or_email.strip().lower(),
            )
        )
        user = db.execute(stmt).scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            audit_service.log(
                db=db,
                action="LOGIN_FAILED",
                user_id=user.id if user else None,
                entity_type="User",
                entity_id=user.id if user else None,
                details={"identifier": username_or_email, "reason": "invalid_credentials"},
                ip_address=ip_address,
            )
            db.commit()
            raise AuthenticationError("Invalid username/email or password.")

        if not user.is_active:
            audit_service.log(
                db=db,
                action="LOGIN_FAILED_INACTIVE",
                user_id=user.id,
                entity_type="User",
                entity_id=user.id,
                details={"reason": "account_inactive"},
                ip_address=ip_address,
            )
            db.commit()
            raise PermissionDeniedError("Account is inactive. Please contact your administrator.")

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.add(user)

        # Retrieve engineer profile if user is engineer
        engineer = None
        if user.role == UserRole.ENGINEER:
            eng_stmt = select(Engineer).where(Engineer.user_id == user.id)
            engineer = db.execute(eng_stmt).scalar_one_or_none()

        # Generate JWT Token
        token = create_access_token(
            subject=user.id,
            role=user.role.value,
            extra_claims={"username": user.username, "email": user.email},
        )

        audit_service.log(
            db=db,
            action="LOGIN_SUCCESS",
            user_id=user.id,
            entity_type="User",
            entity_id=user.id,
            details={"role": user.role.value},
            ip_address=ip_address,
        )
        db.commit()

        return user, engineer, token

    @staticmethod
    def change_password(
        db: Session,
        user: User,
        current_password: str,
        new_password: str,
        ip_address: Optional[str] = None,
    ) -> None:
        """Change password for an authenticated user."""
        if not verify_password(current_password, user.password_hash):
            raise AuthenticationError("Current password does not match.")

        user.password_hash = hash_password(new_password)
        db.add(user)

        audit_service.log(
            db=db,
            action="PASSWORD_CHANGED",
            user_id=user.id,
            entity_type="User",
            entity_id=user.id,
            details={"type": "self_service"},
            ip_address=ip_address,
        )
        db.commit()

    @staticmethod
    def get_user_profile(db: Session, user_id: int) -> Tuple[User, Optional[Engineer]]:
        """Retrieve user and linked engineer record."""
        user = db.get(User, user_id)
        if not user:
            raise NotFoundError("User not found.")

        engineer = None
        if user.role == UserRole.ENGINEER:
            eng_stmt = select(Engineer).where(Engineer.user_id == user.id)
            engineer = db.execute(eng_stmt).scalar_one_or_none()

        return user, engineer


auth_service = AuthService()
