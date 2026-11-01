"""Department Management Service."""

from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.exceptions import ConflictError, NotFoundError, BusinessRuleError
from app.models.department import Department
from app.models.engineer import Engineer
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.services.audit_service import audit_service


class DepartmentService:
    @staticmethod
    def get_all(db: Session, active_only: bool = False) -> List[Department]:
        """List all departments."""
        stmt = select(Department).order_by(Department.name)
        if active_only:
            stmt = stmt.where(Department.is_active.is_(True))
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_by_id(db: Session, department_id: int) -> Department:
        """Get department by ID or raise 404."""
        dept = db.get(Department, department_id)
        if not dept:
            raise NotFoundError(f"Department with ID {department_id} not found.")
        return dept

    @staticmethod
    def create(
        db: Session,
        data: DepartmentCreate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> Department:
        """Create a new unique department."""
        # Check uniqueness
        stmt = select(Department).where(func.lower(Department.name) == data.name.strip().lower())
        if db.execute(stmt).scalar_one_or_none():
            raise ConflictError(f"Department with name '{data.name.strip()}' already exists.")

        dept = Department(
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            is_active=data.is_active,
        )
        db.add(dept)
        db.flush()

        audit_service.log(
            db=db,
            action="DEPARTMENT_CREATED",
            user_id=admin_user_id,
            entity_type="Department",
            entity_id=dept.id,
            details={"name": dept.name},
            ip_address=ip_address,
        )
        db.commit()
        db.refresh(dept)
        return dept

    @staticmethod
    def update(
        db: Session,
        department_id: int,
        data: DepartmentUpdate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> Department:
        """Update existing department."""
        dept = DepartmentService.get_by_id(db, department_id)

        if data.name and data.name.strip().lower() != dept.name.lower():
            # Check uniqueness
            stmt = select(Department).where(
                func.lower(Department.name) == data.name.strip().lower(),
                Department.id != department_id,
            )
            if db.execute(stmt).scalar_one_or_none():
                raise ConflictError(f"Department with name '{data.name.strip()}' already exists.")
            dept.name = data.name.strip()

        if data.description is not None:
            dept.description = data.description.strip() if data.description else None

        if data.is_active is not None:
            dept.is_active = data.is_active

        db.add(dept)

        audit_service.log(
            db=db,
            action="DEPARTMENT_UPDATED",
            user_id=admin_user_id,
            entity_type="Department",
            entity_id=dept.id,
            details={"name": dept.name, "is_active": dept.is_active},
            ip_address=ip_address,
        )
        db.commit()
        db.refresh(dept)
        return dept

    @staticmethod
    def delete(
        db: Session,
        department_id: int,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Safe delete a department if no engineers belong to it."""
        dept = DepartmentService.get_by_id(db, department_id)

        eng_count = db.execute(
            select(func.count(Engineer.id)).where(Engineer.department_id == department_id)
        ).scalar_one()

        if eng_count > 0:
            raise BusinessRuleError(
                message=f"Cannot delete department '{dept.name}' because {eng_count} engineer(s) belong to it. Please reassign engineers or deactivate the department instead.",
                code="DEPARTMENT_IN_USE",
            )

        db.delete(dept)

        audit_service.log(
            db=db,
            action="DEPARTMENT_DELETED",
            user_id=admin_user_id,
            entity_type="Department",
            entity_id=department_id,
            details={"name": dept.name},
            ip_address=ip_address,
        )
        db.commit()


department_service = DepartmentService()
