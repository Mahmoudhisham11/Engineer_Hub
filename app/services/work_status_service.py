"""WorkStatus Management Service."""

from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.work_log import WorkLog
from app.models.work_status import WorkStatus
from app.schemas.work_status import WorkStatusCreate, WorkStatusUpdate
from app.services.audit_service import audit_service


class WorkStatusService:
    @staticmethod
    def get_all(db: Session, active_only: bool = False) -> List[WorkStatus]:
        stmt = select(WorkStatus).order_by(WorkStatus.name)
        if active_only:
            stmt = stmt.where(WorkStatus.is_active.is_(True))
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_by_id(db: Session, work_status_id: int) -> WorkStatus:
        ws = db.get(WorkStatus, work_status_id)
        if not ws:
            raise NotFoundError(f"WorkStatus with ID {work_status_id} not found.")
        return ws

    @staticmethod
    def create(
        db: Session,
        data: WorkStatusCreate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> WorkStatus:
        stmt = select(WorkStatus).where(func.lower(WorkStatus.name) == data.name.strip().lower())
        if db.execute(stmt).scalar_one_or_none():
            raise ConflictError(f"WorkStatus with name '{data.name.strip()}' already exists.")

        ws = WorkStatus(
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            is_active=data.is_active,
        )
        db.add(ws)
        db.flush()

        audit_service.log(
            db=db,
            action="WORK_STATUS_CREATED",
            user_id=admin_user_id,
            entity_type="WorkStatus",
            entity_id=ws.id,
            details={"name": ws.name},
            ip_address=ip_address,
        )
        db.commit()
        db.refresh(ws)
        return ws

    @staticmethod
    def update(
        db: Session,
        work_status_id: int,
        data: WorkStatusUpdate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> WorkStatus:
        ws = WorkStatusService.get_by_id(db, work_status_id)

        if data.name and data.name.strip().lower() != ws.name.lower():
            stmt = select(WorkStatus).where(
                func.lower(WorkStatus.name) == data.name.strip().lower(),
                WorkStatus.id != work_status_id,
            )
            if db.execute(stmt).scalar_one_or_none():
                raise ConflictError(f"WorkStatus with name '{data.name.strip()}' already exists.")
            ws.name = data.name.strip()

        if data.description is not None:
            ws.description = data.description.strip() if data.description else None

        if data.is_active is not None:
            ws.is_active = data.is_active

        db.add(ws)

        audit_service.log(
            db=db,
            action="WORK_STATUS_UPDATED",
            user_id=admin_user_id,
            entity_type="WorkStatus",
            entity_id=ws.id,
            details={"name": ws.name, "is_active": ws.is_active},
            ip_address=ip_address,
        )
        db.commit()
        db.refresh(ws)
        return ws

    @staticmethod
    def delete(
        db: Session,
        work_status_id: int,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        ws = WorkStatusService.get_by_id(db, work_status_id)

        count = db.execute(
            select(func.count(WorkLog.id)).where(WorkLog.work_status_id == work_status_id)
        ).scalar_one()

        if count > 0:
            raise BusinessRuleError(
                message=f"Cannot delete work status '{ws.name}' because {count} work log(s) reference it. Please deactivate it instead.",
                code="WORK_STATUS_IN_USE",
            )

        db.delete(ws)

        audit_service.log(
            db=db,
            action="WORK_STATUS_DELETED",
            user_id=admin_user_id,
            entity_type="WorkStatus",
            entity_id=work_status_id,
            details={"name": ws.name},
            ip_address=ip_address,
        )
        db.commit()


work_status_service = WorkStatusService()
