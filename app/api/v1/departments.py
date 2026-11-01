"""Department API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_client_ip, get_current_user, require_admin
from app.models.user import User, UserRole
from app.schemas.common import MessageResponse
from app.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate
from app.services.department_service import department_service

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=List[DepartmentResponse], summary="List departments")
def list_departments(
    active_only: Optional[bool] = Query(None, description="Filter active departments only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List departments. Non-admin users automatically receive active-only departments."""
    should_filter_active = True if current_user.role != UserRole.ADMIN else (active_only if active_only is not None else False)
    departments = department_service.get_all(db, active_only=should_filter_active)
    return [DepartmentResponse.model_validate(d) for d in departments]


@router.post("", response_model=DepartmentResponse, status_code=201, summary="Create a department (Admin)")
def create_department(
    request: Request,
    body: DepartmentCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new department (Admin only)."""
    client_ip = get_client_ip(request)
    dept = department_service.create(
        db=db,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return DepartmentResponse.model_validate(dept)


@router.get("/{id}", response_model=DepartmentResponse, summary="Get department by ID")
def get_department(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single department details."""
    dept = department_service.get_by_id(db, id)
    return DepartmentResponse.model_validate(dept)


@router.put("/{id}", response_model=DepartmentResponse, summary="Update a department (Admin)")
def update_department(
    id: int,
    request: Request,
    body: DepartmentUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update department name, description, or active status (Admin only)."""
    client_ip = get_client_ip(request)
    dept = department_service.update(
        db=db,
        department_id=id,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return DepartmentResponse.model_validate(dept)


@router.delete("/{id}", response_model=MessageResponse, summary="Delete a department (Admin)")
def delete_department(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a department if no engineers belong to it (Admin only)."""
    client_ip = get_client_ip(request)
    department_service.delete(
        db=db,
        department_id=id,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return MessageResponse(success=True, message="Department deleted successfully.")
