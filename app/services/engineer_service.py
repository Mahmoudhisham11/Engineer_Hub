"""Engineer Management Service."""

from typing import Optional
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload
from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.department import Department
from app.models.engineer import Engineer
from app.models.user import User, UserRole
from app.models.work_log import WorkLog
from app.schemas.engineer import EngineerCreate, EngineerResponse, EngineerUpdate
from app.services.audit_service import audit_service
from app.utils.pagination import paginate_list


class EngineerService:
    @staticmethod
    def get_by_id(db: Session, engineer_id: int) -> Engineer:
        """Get engineer with department and user eager loaded."""
        stmt = (
            select(Engineer)
            .options(joinedload(Engineer.department), joinedload(Engineer.user))
            .where(Engineer.id == engineer_id)
        )
        engineer = db.execute(stmt).scalar_one_or_none()
        if not engineer:
            raise NotFoundError(f"Engineer with ID {engineer_id} not found.")
        return engineer

    @staticmethod
    def get_by_user_id(db: Session, user_id: int) -> Engineer:
        """Get engineer record for a given user ID."""
        stmt = (
            select(Engineer)
            .options(joinedload(Engineer.department), joinedload(Engineer.user))
            .where(Engineer.user_id == user_id)
        )
        engineer = db.execute(stmt).scalar_one_or_none()
        if not engineer:
            raise NotFoundError("Engineer profile not found for this user account.")
        return engineer

    @staticmethod
    def get_all(
        db: Session,
        page: int = 1,
        page_size: int = 25,
        search: Optional[str] = None,
        department_id: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> dict:
        """List engineers with rich filtering, search and pagination."""
        query = (
            select(Engineer)
            .options(joinedload(Engineer.department), joinedload(Engineer.user))
            .join(User, Engineer.user_id == User.id)
            .outerjoin(Department, Engineer.department_id == Department.id)
        )
        count_query = select(func.count(Engineer.id)).join(User, Engineer.user_id == User.id)

        if search:
            search_filter = or_(
                Engineer.full_name.ilike(f"%{search.strip()}%"),
                Engineer.employee_code.ilike(f"%{search.strip()}%"),
                User.username.ilike(f"%{search.strip()}%"),
                User.email.ilike(f"%{search.strip()}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if department_id:
            query = query.where(Engineer.department_id == department_id)
            count_query = count_query.where(Engineer.department_id == department_id)

        if is_active is not None:
            query = query.where(Engineer.is_active == is_active)
            count_query = count_query.where(Engineer.is_active == is_active)

        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(Engineer.full_name).offset(offset).limit(page_size)

        engineers = db.execute(query).scalars().all()

        items = [EngineerResponse.model_validate(e) for e in engineers]
        return paginate_list(items, total, page, page_size)

    @staticmethod
    def create(
        db: Session,
        data: EngineerCreate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> Engineer:
        """Create a user account and linked engineer profile transactionally."""
        # Check Department exists and is active
        dept = db.get(Department, data.department_id)
        if not dept:
            raise NotFoundError(f"Department with ID {data.department_id} not found.")
        if not dept.is_active:
            raise BusinessRuleError(f"Cannot assign engineer to inactive department '{dept.name}'.")

        # Check Username uniqueness
        user_check = db.execute(
            select(User).where(func.lower(User.username) == data.username.strip().lower())
        ).scalar_one_or_none()
        if user_check:
            raise ConflictError(f"Username '{data.username.strip()}' is already taken.")

        # Check Email uniqueness
        email_check = db.execute(
            select(User).where(func.lower(User.email) == data.email.strip().lower())
        ).scalar_one_or_none()
        if email_check:
            raise ConflictError(f"Email '{data.email.strip()}' is already in use.")

        # Check Employee code uniqueness
        code_check = db.execute(
            select(Engineer).where(func.lower(Engineer.employee_code) == data.employee_code.strip().lower())
        ).scalar_one_or_none()
        if code_check:
            raise ConflictError(f"Employee code '{data.employee_code.strip()}' is already in use.")

        # 1. Create User
        user = User(
            username=data.username.strip(),
            email=data.email.strip().lower(),
            password_hash=hash_password(data.password),
            role=data.role if hasattr(data, "role") and data.role else UserRole.ENGINEER,
            is_active=data.is_active,
        )
        db.add(user)
        db.flush()  # to generate user.id

        # 2. Create Engineer
        engineer = Engineer(
            user_id=user.id,
            employee_code=data.employee_code.strip(),
            full_name=data.full_name.strip(),
            department_id=data.department_id,
            is_active=data.is_active,
        )
        db.add(engineer)
        db.flush()

        audit_service.log(
            db=db,
            action="ENGINEER_CREATED",
            user_id=admin_user_id,
            entity_type="Engineer",
            entity_id=engineer.id,
            details={
                "employee_code": engineer.employee_code,
                "full_name": engineer.full_name,
                "department_id": engineer.department_id,
                "username": user.username,
                "role": user.role.value,
            },
            ip_address=ip_address,
        )
        db.commit()

        return EngineerService.get_by_id(db, engineer.id)

    @staticmethod
    def update(
        db: Session,
        engineer_id: int,
        data: EngineerUpdate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> Engineer:
        """Update engineer profile and associated user details."""
        engineer = EngineerService.get_by_id(db, engineer_id)
        user = engineer.user

        if data.department_id and data.department_id != engineer.department_id:
            dept = db.get(Department, data.department_id)
            if not dept:
                raise NotFoundError(f"Department with ID {data.department_id} not found.")
            if not dept.is_active:
                raise BusinessRuleError(f"Cannot reassign to inactive department '{dept.name}'.")
            engineer.department_id = data.department_id

        if data.employee_code and data.employee_code.strip().lower() != engineer.employee_code.lower():
            code_check = db.execute(
                select(Engineer).where(
                    func.lower(Engineer.employee_code) == data.employee_code.strip().lower(),
                    Engineer.id != engineer_id,
                )
            ).scalar_one_or_none()
            if code_check:
                raise ConflictError(f"Employee code '{data.employee_code.strip()}' is already in use.")
            engineer.employee_code = data.employee_code.strip()

        if data.full_name:
            engineer.full_name = data.full_name.strip()

        if data.email and user and data.email.strip().lower() != user.email.lower():
            email_check = db.execute(
                select(User).where(
                    func.lower(User.email) == data.email.strip().lower(),
                    User.id != user.id,
                )
            ).scalar_one_or_none()
            if email_check:
                raise ConflictError(f"Email '{data.email.strip()}' is already in use.")
            user.email = data.email.strip().lower()
            db.add(user)

        if data.role is not None and user and user.role != data.role:
            user.role = data.role
            db.add(user)

        if data.is_active is not None:
            engineer.is_active = data.is_active
            if user:
                user.is_active = data.is_active
                db.add(user)

        db.add(engineer)

        audit_service.log(
            db=db,
            action="ENGINEER_UPDATED",
            user_id=admin_user_id,
            entity_type="Engineer",
            entity_id=engineer.id,
            details={
                "full_name": engineer.full_name,
                "employee_code": engineer.employee_code,
                "role": user.role.value if user else None,
            },
            ip_address=ip_address,
        )
        db.commit()

        return EngineerService.get_by_id(db, engineer.id)

    @staticmethod
    def change_role(
        db: Session,
        engineer_id: int,
        role: UserRole,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> Engineer:
        """Change user account role (e.g. promote to ADMIN or revert to ENGINEER)."""
        engineer = EngineerService.get_by_id(db, engineer_id)
        user = engineer.user
        if not user:
            raise NotFoundError("User account not linked to this engineer.")

        old_role = user.role
        user.role = role
        db.add(user)

        audit_service.log(
            db=db,
            action="USER_ROLE_CHANGED",
            user_id=admin_user_id,
            entity_type="User",
            entity_id=user.id,
            details={
                "engineer_id": engineer.id,
                "engineer_name": engineer.full_name,
                "old_role": old_role.value,
                "new_role": role.value,
            },
            ip_address=ip_address,
        )
        db.commit()

        return EngineerService.get_by_id(db, engineer.id)

    @staticmethod
    def set_active_status(
        db: Session,
        engineer_id: int,
        is_active: bool,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> Engineer:
        """Activate or deactivate engineer and linked user."""
        engineer = EngineerService.get_by_id(db, engineer_id)
        engineer.is_active = is_active
        if engineer.user:
            engineer.user.is_active = is_active
            db.add(engineer.user)

        db.add(engineer)

        action = "ENGINEER_ACTIVATED" if is_active else "ENGINEER_DEACTIVATED"
        audit_service.log(
            db=db,
            action=action,
            user_id=admin_user_id,
            entity_type="Engineer",
            entity_id=engineer.id,
            details={"employee_code": engineer.employee_code, "is_active": is_active},
            ip_address=ip_address,
        )
        db.commit()

        return EngineerService.get_by_id(db, engineer.id)

    @staticmethod
    def reset_password(
        db: Session,
        engineer_id: int,
        new_password: str,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Admin resets an engineer's password."""
        engineer = EngineerService.get_by_id(db, engineer_id)
        if not engineer.user:
            raise NotFoundError("Linked user account not found.")

        engineer.user.password_hash = hash_password(new_password)
        db.add(engineer.user)

        audit_service.log(
            db=db,
            action="ENGINEER_PASSWORD_RESET_BY_ADMIN",
            user_id=admin_user_id,
            entity_type="User",
            entity_id=engineer.user_id,
            details={"engineer_id": engineer.id, "employee_code": engineer.employee_code},
            ip_address=ip_address,
        )
        db.commit()

    @staticmethod
    def delete(
        db: Session,
        engineer_id: int,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Safe delete engineer if no work logs exist."""
        engineer = EngineerService.get_by_id(db, engineer_id)

        work_log_count = db.execute(
            select(func.count(WorkLog.id)).where(WorkLog.engineer_id == engineer_id)
        ).scalar_one()

        if work_log_count > 0:
            raise BusinessRuleError(
                message=(
                    f"Cannot delete engineer '{engineer.full_name}' ({engineer.employee_code}) because {work_log_count} "
                    f"historical work logs are recorded. Please deactivate the account instead."
                ),
                code="ENGINEER_IN_USE",
            )

        user_id = engineer.user_id
        db.delete(engineer)
        if user_id:
            user = db.get(User, user_id)
            if user:
                db.delete(user)

        audit_service.log(
            db=db,
            action="ENGINEER_DELETED",
            user_id=admin_user_id,
            entity_type="Engineer",
            entity_id=engineer_id,
            details={"employee_code": engineer.employee_code, "full_name": engineer.full_name},
            ip_address=ip_address,
        )
        db.commit()


engineer_service = EngineerService()
