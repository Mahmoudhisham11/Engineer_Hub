"""Project Management Service."""

from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.project import Project
from app.models.work_log import WorkLog
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.audit_service import audit_service


class ProjectService:
    @staticmethod
    def get_all(db: Session, active_only: bool = False) -> List[Project]:
        """List all projects."""
        stmt = select(Project).order_by(Project.name)
        if active_only:
            stmt = stmt.where(Project.is_active.is_(True))
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_by_id(db: Session, project_id: int) -> Project:
        """Get project by ID or raise 404."""
        project = db.get(Project, project_id)
        if not project:
            raise NotFoundError(f"Project with ID {project_id} not found.")
        return project

    @staticmethod
    def create(
        db: Session,
        data: ProjectCreate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> Project:
        """Create a new project."""
        # Check project code uniqueness
        stmt = select(Project).where(func.lower(Project.project_code) == data.project_code.strip().lower())
        if db.execute(stmt).scalar_one_or_none():
            raise ConflictError(f"Project with code '{data.project_code.strip()}' already exists.")

        project = Project(
            name=data.name.strip(),
            project_code=data.project_code.strip(),
            description=data.description.strip() if data.description else None,
            is_active=data.is_active,
        )
        db.add(project)
        db.flush()

        audit_service.log(
            db=db,
            action="PROJECT_CREATED",
            user_id=admin_user_id,
            entity_type="Project",
            entity_id=project.id,
            details={"code": project.project_code, "name": project.name},
            ip_address=ip_address,
        )
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def update(
        db: Session,
        project_id: int,
        data: ProjectUpdate,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> Project:
        """Update existing project."""
        project = ProjectService.get_by_id(db, project_id)

        if data.project_code and data.project_code.strip().lower() != project.project_code.lower():
            stmt = select(Project).where(
                func.lower(Project.project_code) == data.project_code.strip().lower(),
                Project.id != project_id,
            )
            if db.execute(stmt).scalar_one_or_none():
                raise ConflictError(f"Project with code '{data.project_code.strip()}' already exists.")
            project.project_code = data.project_code.strip()

        if data.name:
            project.name = data.name.strip()

        if data.description is not None:
            project.description = data.description.strip() if data.description else None

        if data.is_active is not None:
            project.is_active = data.is_active

        db.add(project)

        audit_service.log(
            db=db,
            action="PROJECT_UPDATED",
            user_id=admin_user_id,
            entity_type="Project",
            entity_id=project.id,
            details={"code": project.project_code, "is_active": project.is_active},
            ip_address=ip_address,
        )
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def set_active_status(
        db: Session,
        project_id: int,
        is_active: bool,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> Project:
        """Activate or deactivate a project."""
        project = ProjectService.get_by_id(db, project_id)
        project.is_active = is_active
        db.add(project)

        action = "PROJECT_ACTIVATED" if is_active else "PROJECT_DEACTIVATED"
        audit_service.log(
            db=db,
            action=action,
            user_id=admin_user_id,
            entity_type="Project",
            entity_id=project.id,
            details={"code": project.project_code, "is_active": is_active},
            ip_address=ip_address,
        )
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def delete(
        db: Session,
        project_id: int,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Safe delete a project if no work logs reference it."""
        project = ProjectService.get_by_id(db, project_id)

        work_log_count = db.execute(
            select(func.count(WorkLog.id)).where(WorkLog.project_id == project_id)
        ).scalar_one()

        if work_log_count > 0:
            raise BusinessRuleError(
                message=(
                    f"Cannot delete project '{project.name}' ({project.project_code}) because {work_log_count} "
                    f"historical work log(s) reference it. Please deactivate the project instead to preserve history."
                ),
                code="PROJECT_IN_USE",
            )

        db.delete(project)

        audit_service.log(
            db=db,
            action="PROJECT_DELETED",
            user_id=admin_user_id,
            entity_type="Project",
            entity_id=project_id,
            details={"code": project.project_code, "name": project.name},
            ip_address=ip_address,
        )
        db.commit()


project_service = ProjectService()
