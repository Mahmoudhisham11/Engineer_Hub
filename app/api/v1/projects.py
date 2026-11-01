"""Project API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_client_ip, get_current_user, require_admin
from app.models.user import User, UserRole
from app.schemas.common import MessageResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.project_service import project_service

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectResponse], summary="List projects")
def list_projects(
    active_only: Optional[bool] = Query(None, description="Filter active projects only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List projects. Engineers receive active projects; Admins can see all or filter."""
    should_filter_active = True if current_user.role != UserRole.ADMIN else (active_only if active_only is not None else False)
    projects = project_service.get_all(db, active_only=should_filter_active)
    return [ProjectResponse.model_validate(p) for p in projects]


@router.post("", response_model=ProjectResponse, status_code=201, summary="Create a project (Admin)")
def create_project(
    request: Request,
    body: ProjectCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new project (Admin only)."""
    client_ip = get_client_ip(request)
    project = project_service.create(
        db=db,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return ProjectResponse.model_validate(project)


@router.get("/{id}", response_model=ProjectResponse, summary="Get project by ID")
def get_project(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get project details by ID."""
    project = project_service.get_by_id(db, id)
    return ProjectResponse.model_validate(project)


@router.put("/{id}", response_model=ProjectResponse, summary="Update a project (Admin)")
def update_project(
    id: int,
    request: Request,
    body: ProjectUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update project details (Admin only)."""
    client_ip = get_client_ip(request)
    project = project_service.update(
        db=db,
        project_id=id,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return ProjectResponse.model_validate(project)


@router.patch("/{id}/activate", response_model=ProjectResponse, summary="Activate a project (Admin)")
def activate_project(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reactivate a project (Admin only)."""
    client_ip = get_client_ip(request)
    project = project_service.set_active_status(
        db=db,
        project_id=id,
        is_active=True,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return ProjectResponse.model_validate(project)


@router.patch("/{id}/deactivate", response_model=ProjectResponse, summary="Deactivate a project (Admin)")
def deactivate_project(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Deactivate a project (Admin only)."""
    client_ip = get_client_ip(request)
    project = project_service.set_active_status(
        db=db,
        project_id=id,
        is_active=False,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return ProjectResponse.model_validate(project)


@router.delete("/{id}", response_model=MessageResponse, summary="Delete a project (Admin)")
def delete_project(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Safe delete project if no work logs reference it (Admin only)."""
    client_ip = get_client_ip(request)
    project_service.delete(
        db=db,
        project_id=id,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return MessageResponse(success=True, message="Project deleted successfully.")
