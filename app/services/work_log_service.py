"""WorkLog Management and Business Logic Service."""

from datetime import date
from decimal import Decimal
from typing import Optional
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload
from app.core.exceptions import BusinessRuleError, NotFoundError, PermissionDeniedError
from app.models.department import Department
from app.models.engineer import Engineer
from app.models.project import Project
from app.models.work_log import WorkLog
from app.models.work_status import WorkStatus
from app.models.work_type import WorkType
from app.schemas.work_log import WorkLogAdminCreate, WorkLogCreate, WorkLogResponse, WorkLogUpdate
from app.services.audit_service import audit_service
from app.services.calendar_service import calendar_service
from app.utils.pagination import paginate_list


class WorkLogService:
    @staticmethod
    def get_by_id(db: Session, work_log_id: int) -> WorkLog:
        """Fetch work log by ID with related entities joined."""
        stmt = (
            select(WorkLog)
            .options(
                joinedload(WorkLog.engineer),
                joinedload(WorkLog.project),
                joinedload(WorkLog.work_type),
                joinedload(WorkLog.work_status),
            )
            .where(WorkLog.id == work_log_id)
        )
        log_entry = db.execute(stmt).scalar_one_or_none()
        if not log_entry:
            raise NotFoundError(f"WorkLog with ID {work_log_id} not found.")
        return log_entry

    @staticmethod
    def _validate_foreign_entities(
        db: Session,
        engineer_id: int,
        project_id: int,
        work_type_id: int,
        work_status_id: int,
    ) -> None:
        """Ensure all referenced entities exist and are active."""
        engineer = db.get(Engineer, engineer_id)
        if not engineer:
            raise NotFoundError(f"Engineer with ID {engineer_id} not found.")
        if not engineer.is_active:
            raise BusinessRuleError("Cannot log hours for an inactive engineer account.")

        project = db.get(Project, project_id)
        if not project:
            raise NotFoundError(f"Project with ID {project_id} not found.")
        if not project.is_active:
            raise BusinessRuleError(f"Cannot log hours to inactive project '{project.name}'.")

        work_type = db.get(WorkType, work_type_id)
        if not work_type:
            raise NotFoundError(f"WorkType with ID {work_type_id} not found.")
        if not work_type.is_active:
            raise BusinessRuleError(f"Cannot log hours with inactive work type '{work_type.name}'.")

        work_status = db.get(WorkStatus, work_status_id)
        if not work_status:
            raise NotFoundError(f"WorkStatus with ID {work_status_id} not found.")
        if not work_status.is_active:
            raise BusinessRuleError(f"Cannot log hours with inactive work status '{work_status.name}'.")

    @staticmethod
    def create(
        db: Session,
        engineer_id: int,
        data: WorkLogCreate,
        current_user_id: int,
        ip_address: Optional[str] = None,
    ) -> WorkLog:
        """Create a new work log with calendar & max daily hours validation."""
        # 1. Calendar non-working day check (Fridays/Saturdays)
        calendar_service.validate_working_day(data.work_date)

        # 2. Check entities existence and active status
        WorkLogService._validate_foreign_entities(
            db=db,
            engineer_id=engineer_id,
            project_id=data.project_id,
            work_type_id=data.work_type_id,
            work_status_id=data.work_status_id,
        )

        # 3. Validate daily work hours limit
        calendar_service.validate_daily_hours(
            db=db,
            engineer_id=engineer_id,
            work_date=data.work_date,
            new_hours=data.hours,
        )

        # 4. Create WorkLog
        work_log = WorkLog(
            engineer_id=engineer_id,
            work_date=data.work_date,
            project_id=data.project_id,
            hours=data.hours,
            work_type_id=data.work_type_id,
            work_status_id=data.work_status_id,
            notes=data.notes.strip() if data.notes else None,
        )
        db.add(work_log)
        db.flush()

        audit_service.log(
            db=db,
            action="WORK_LOG_CREATED",
            user_id=current_user_id,
            entity_type="WorkLog",
            entity_id=work_log.id,
            details={
                "engineer_id": engineer_id,
                "work_date": data.work_date.isoformat(),
                "hours": float(data.hours),
                "project_id": data.project_id,
            },
            ip_address=ip_address,
        )
        db.commit()

        return WorkLogService.get_by_id(db, work_log.id)

    @staticmethod
    def update(
        db: Session,
        work_log_id: int,
        data: WorkLogUpdate,
        current_user_id: int,
        engineer_id_filter: Optional[int] = None,  # If provided, enforces ownership (IDOR protection)
        ip_address: Optional[str] = None,
    ) -> WorkLog:
        """Update an existing work log with validation and ownership check."""
        work_log = WorkLogService.get_by_id(db, work_log_id)

        # Ownership check for engineers
        if engineer_id_filter is not None and work_log.engineer_id != engineer_id_filter:
            raise PermissionDeniedError("You are not authorized to modify another engineer's work log.")

        target_date = data.work_date or work_log.work_date
        target_hours = data.hours if data.hours is not None else work_log.hours
        target_project_id = data.project_id or work_log.project_id
        target_type_id = data.work_type_id or work_log.work_type_id
        target_status_id = data.work_status_id or work_log.work_status_id

        # 1. Validate working day if date changed
        if data.work_date and data.work_date != work_log.work_date:
            calendar_service.validate_working_day(data.work_date)

        # 2. Validate foreign entities
        WorkLogService._validate_foreign_entities(
            db=db,
            engineer_id=work_log.engineer_id,
            project_id=target_project_id,
            work_type_id=target_type_id,
            work_status_id=target_status_id,
        )

        # 3. Validate daily hours if hours or date changed
        if data.hours is not None or data.work_date is not None:
            calendar_service.validate_daily_hours(
                db=db,
                engineer_id=work_log.engineer_id,
                work_date=target_date,
                new_hours=target_hours,
                exclude_work_log_id=work_log.id,
            )

        # Apply updates
        if data.work_date is not None:
            work_log.work_date = data.work_date
        if data.hours is not None:
            work_log.hours = data.hours
        if data.project_id is not None:
            work_log.project_id = data.project_id
        if data.work_type_id is not None:
            work_log.work_type_id = data.work_type_id
        if data.work_status_id is not None:
            work_log.work_status_id = data.work_status_id
        if data.notes is not None:
            work_log.notes = data.notes.strip() if data.notes else None

        db.add(work_log)

        audit_service.log(
            db=db,
            action="WORK_LOG_UPDATED",
            user_id=current_user_id,
            entity_type="WorkLog",
            entity_id=work_log.id,
            details={
                "engineer_id": work_log.engineer_id,
                "work_date": work_log.work_date.isoformat(),
                "hours": float(work_log.hours),
            },
            ip_address=ip_address,
        )
        db.commit()

        return WorkLogService.get_by_id(db, work_log.id)

    @staticmethod
    def delete(
        db: Session,
        work_log_id: int,
        current_user_id: int,
        engineer_id_filter: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Delete work log with ownership verification."""
        work_log = WorkLogService.get_by_id(db, work_log_id)

        if engineer_id_filter is not None and work_log.engineer_id != engineer_id_filter:
            raise PermissionDeniedError("You are not authorized to delete another engineer's work log.")

        db.delete(work_log)

        audit_service.log(
            db=db,
            action="WORK_LOG_DELETED",
            user_id=current_user_id,
            entity_type="WorkLog",
            entity_id=work_log_id,
            details={
                "engineer_id": work_log.engineer_id,
                "work_date": work_log.work_date.isoformat(),
                "hours": float(work_log.hours),
            },
            ip_address=ip_address,
        )
        db.commit()

    @staticmethod
    def list_work_logs(
        db: Session,
        page: int = 1,
        page_size: int = 25,
        engineer_id: Optional[int] = None,
        department_id: Optional[int] = None,
        project_id: Optional[int] = None,
        work_type_id: Optional[int] = None,
        work_status_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        min_hours: Optional[Decimal] = None,
        max_hours: Optional[Decimal] = None,
        engineer_is_active: Optional[bool] = None,
    ) -> dict:
        """Rich database-level filtering and pagination for work logs."""
        query = (
            select(WorkLog)
            .options(
                joinedload(WorkLog.engineer),
                joinedload(WorkLog.project),
                joinedload(WorkLog.work_type),
                joinedload(WorkLog.work_status),
            )
            .join(Engineer, WorkLog.engineer_id == Engineer.id)
            .join(Project, WorkLog.project_id == Project.id)
        )
        count_query = (
            select(func.count(WorkLog.id))
            .join(Engineer, WorkLog.engineer_id == Engineer.id)
            .join(Project, WorkLog.project_id == Project.id)
        )

        if engineer_id:
            query = query.where(WorkLog.engineer_id == engineer_id)
            count_query = count_query.where(WorkLog.engineer_id == engineer_id)

        if department_id:
            query = query.where(Engineer.department_id == department_id)
            count_query = count_query.where(Engineer.department_id == department_id)

        if project_id:
            query = query.where(WorkLog.project_id == project_id)
            count_query = count_query.where(WorkLog.project_id == project_id)

        if work_type_id:
            query = query.where(WorkLog.work_type_id == work_type_id)
            count_query = count_query.where(WorkLog.work_type_id == work_type_id)

        if work_status_id:
            query = query.where(WorkLog.work_status_id == work_status_id)
            count_query = count_query.where(WorkLog.work_status_id == work_status_id)

        if date_from:
            query = query.where(WorkLog.work_date >= date_from)
            count_query = count_query.where(WorkLog.work_date >= date_from)

        if date_to:
            query = query.where(WorkLog.work_date <= date_to)
            count_query = count_query.where(WorkLog.work_date <= date_to)

        if min_hours is not None:
            query = query.where(WorkLog.hours >= min_hours)
            count_query = count_query.where(WorkLog.hours >= min_hours)

        if max_hours is not None:
            query = query.where(WorkLog.hours <= max_hours)
            count_query = count_query.where(WorkLog.hours <= max_hours)

        if engineer_is_active is not None:
            query = query.where(Engineer.is_active == engineer_is_active)
            count_query = count_query.where(Engineer.is_active == engineer_is_active)

        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(desc(WorkLog.work_date), desc(WorkLog.id)).offset(offset).limit(page_size)

        work_logs = db.execute(query).scalars().all()
        items = [WorkLogResponse.model_validate(wl) for wl in work_logs]

        return paginate_list(items, total, page, page_size)


work_log_service = WorkLogService()
