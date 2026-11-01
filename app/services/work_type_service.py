"""WorkType Management Service."""

from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.work_log import WorkLog
from app.models.work_type import WorkType
from app.schemas.work_type import WorkTypeCreate, WorkTypeUpdate
from app.services.audit_service import audit_service


class WorkTypeService:
    @staticmethod
    def get_all(db: Session, active_only: bool = False) -> List[WorkType]:
        stmt = select(WorkType).order_by(WorkType.name)
        if active_only:
            stmt = stmt.where(WorkType.is_active.is_(True))
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_by_id(db: Session, work_type_id: int) -> WorkType:
        wt = db.get(WorkType, work_type_id)
        if not wt:
            raise NotFoundError(f"WorkType with ID {work_type_id} not found.")
        return wt

    @staticmethod
    def create(
        db: Session,
        data: WorkTypeCreate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> WorkType:
        stmt = select(WorkType).where(func.lower(WorkType.name) == data.name.strip().lower())
        if db.execute(stmt).scalar_one_or_none():
            raise ConflictError(f"WorkType with name '{data.name.strip()}' already exists.")

        wt = WorkType(
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            is_active=data.is_active,
        )
        db.add(wt)
        db.flush()

        audit_service.log(
            db=db,
            action="WORK_TYPE_CREATED",
            user_id=admin_user_id,
            entity_type="WorkType",
            entity_id=wt.id,
            details={"name": wt.name},
            ip_address=ip_address,
        )
        db.commit()
        db.refresh(wt)
        return wt

    @staticmethod
    def update(
        db: Session,
        work_type_id: int,
        data: WorkTypeUpdate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> WorkType:
        wt = WorkTypeService.get_by_id(db, work_type_id)

        if data.name and data.name.strip().lower() != wt.name.lower():
            stmt = select(WorkType).where(
                func.lower(WorkType.name) == data.name.strip().lower(),
                WorkType.id != work_type_id,
            )
            if db.execute(stmt).scalar_one_or_none():
                raise ConflictError(f"WorkType with name '{data.name.strip()}' already exists.")
            wt.name = data.name.strip()

        if data.description is not None:
            wt.description = data.description.strip() if data.description else None

        if data.is_active is not None:
            wt.is_active = data.is_active

        db.add(wt)

        audit_service.log(
            db=db,
            action="WORK_TYPE_UPDATED",
            user_id=admin_user_id,
            entity_type="WorkType",
            entity_id=wt.id,
            details={"name": wt.name, "is_active": wt.is_active},
            ip_address=ip_address,
        )
        db.commit()
        db.refresh(wt)
        return wt

    @staticmethod
    def delete(
        db: Session,
        work_type_id: int,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        wt = WorkTypeService.get_by_id(db, work_type_id)

        count = db.execute(
            select(func.count(WorkLog.id)).where(WorkLog.work_type_id == work_type_id)
        ).scalar_one()

        if count > 0:
            raise BusinessRuleError(
                message=f"Cannot delete work type '{wt.name}' because {count} work log(s) reference it. Please deactivate it instead.",
                code="WORK_TYPE_IN_USE",
            )

        db.delete(wt)

        audit_service.log(
            db=db,
            action="WORK_TYPE_DELETED",
            user_id=admin_user_id,
            entity_type="WorkType",
            entity_id=work_type_id,
            details={"name": wt.name},
            ip_address=ip_address,
        )
        db.commit()


work_type_service = WorkTypeService()
