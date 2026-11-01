"""CLI utility to create an Administrator account securely."""

import argparse
import getpass
import sys
from sqlalchemy import select
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.services.audit_service import audit_service


def create_admin(username: str, email: str, password: str) -> None:
    """Create an administrator account."""
    db = SessionLocal()
    try:
        # Check username
        existing_user = db.execute(
            select(User).where(User.username == username.strip())
        ).scalar_one_or_none()
        if existing_user:
            print(f"Error: User with username '{username}' already exists.")
            sys.exit(1)

        # Check email
        existing_email = db.execute(
            select(User).where(User.email == email.strip().lower())
        ).scalar_one_or_none()
        if existing_email:
            print(f"Error: User with email '{email}' already exists.")
            sys.exit(1)

        admin_user = User(
            username=username.strip(),
            email=email.strip().lower(),
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin_user)
        db.flush()

        audit_service.log(
            db=db,
            action="ADMIN_USER_CREATED_CLI",
            user_id=admin_user.id,
            entity_type="User",
            entity_id=admin_user.id,
            details={"username": admin_user.username, "email": admin_user.email},
        )
        db.commit()
        print(f"Successfully created Admin user '{username}' (ID: {admin_user.id}).")
    except Exception as e:
        db.rollback()
        print(f"Failed to create admin user: {e}")
        sys.exit(1)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Create an Admin user for EngineerHub.")
    parser.add_argument("--username", help="Admin username")
    parser.add_argument("--email", help="Admin email address")
    parser.add_argument("--password", help="Admin password (will prompt if omitted)")

    args = parser.parse_args()

    username = args.username or input("Enter Admin Username: ").strip()
    if not username:
        print("Username cannot be empty.")
        sys.exit(1)

    email = args.email or input("Enter Admin Email: ").strip()
    if not email or "@" not in email:
        print("A valid email is required.")
        sys.exit(1)

    password = args.password
    if not password:
        password = getpass.getpass("Enter Admin Password: ").strip()
        confirm_password = getpass.getpass("Confirm Admin Password: ").strip()
        if password != confirm_password:
            print("Passwords do not match.")
            sys.exit(1)

    if len(password) < 6:
        print("Password must be at least 6 characters.")
        sys.exit(1)

    create_admin(username, email, password)


if __name__ == "__main__":
    main()
