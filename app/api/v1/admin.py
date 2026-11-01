"""Admin Management API endpoints."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_client_ip, get_pagination, require_admin
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse
from app.schemas.auth import AdminResetPasswordRequest
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.engineer import EngineerCreate, EngineerResponse, EngineerRoleUpdate, EngineerUpdate
from app.schemas.work_log import WorkLogAdminCreate, WorkLogCreate, WorkLogResponse, WorkLogUpdate
from app.services.audit_service import audit_service
from app.services.engineer_service import engineer_service
from app.services.work_log_service import work_log_service
from app.utils.pagination import PaginationParams

router = APIRouter(prefix="/admin", tags=["Administration"])


# =====================================================================
# 1. Engineer Administration Endpoints
# =====================================================================

@router.get("/engineers", response_model=PaginatedResponse[EngineerResponse], summary="List engineers with filtering (Admin)")
def list_engineers(
    search: Optional[str] = Query(None, description="Search by name, employee code, username, or email"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    is_active: Optional[bool] = Query(None, description="Filter active/inactive engineers"),
    pagination: PaginationParams = Depends(get_pagination),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List engineers with search, department filtering, active status filter, and pagination."""
    return engineer_service.get_all(
        db=db,
        page=pagination.page,
        page_size=pagination.page_size,
        search=search,
        department_id=department_id,
        is_active=is_active,
    )


@router.post("/engineers", response_model=EngineerResponse, status_code=201, summary="Create an engineer (Admin)")
def create_engineer(
    request: Request,
    body: EngineerCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new engineer profile and authentication user account."""
    client_ip = get_client_ip(request)
    engineer = engineer_service.create(
        db=db,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return EngineerResponse.model_validate(engineer)


@router.get("/engineers/{id}", response_model=EngineerResponse, summary="Get engineer by ID (Admin)")
def get_engineer(
    id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get single engineer details by ID."""
    engineer = engineer_service.get_by_id(db, id)
    return EngineerResponse.model_validate(engineer)


@router.put("/engineers/{id}", response_model=EngineerResponse, summary="Update engineer (Admin)")
def update_engineer(
    id: int,
    request: Request,
    body: EngineerUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update engineer details (full name, department, employee code, active status)."""
    client_ip = get_client_ip(request)
    engineer = engineer_service.update(
        db=db,
        engineer_id=id,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return EngineerResponse.model_validate(engineer)


@router.patch("/engineers/{id}/role", response_model=EngineerResponse, summary="Change engineer user role (Admin)")
def change_engineer_role(
    id: int,
    request: Request,
    body: EngineerRoleUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Promote user to ADMIN or change to ENGINEER role."""
    client_ip = get_client_ip(request)
    engineer = engineer_service.change_role(
        db=db,
        engineer_id=id,
        role=body.role,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return EngineerResponse.model_validate(engineer)


@router.patch("/engineers/{id}/activate", response_model=EngineerResponse, summary="Activate engineer (Admin)")
def activate_engineer(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Activate engineer and enable login account."""
    client_ip = get_client_ip(request)
    engineer = engineer_service.set_active_status(
        db=db,
        engineer_id=id,
        is_active=True,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return EngineerResponse.model_validate(engineer)


@router.patch("/engineers/{id}/deactivate", response_model=EngineerResponse, summary="Deactivate engineer (Admin)")
def deactivate_engineer(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Deactivate engineer and disable login account."""
    client_ip = get_client_ip(request)
    engineer = engineer_service.set_active_status(
        db=db,
        engineer_id=id,
        is_active=False,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return EngineerResponse.model_validate(engineer)


@router.delete("/engineers/{id}", response_model=MessageResponse, summary="Delete engineer (Admin)")
def delete_engineer(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Safe delete engineer if no work logs exist."""
    client_ip = get_client_ip(request)
    engineer_service.delete(
        db=db,
        engineer_id=id,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return MessageResponse(success=True, message="Engineer deleted successfully.")


@router.post("/engineers/{id}/reset-password", response_model=MessageResponse, summary="Reset engineer password (Admin)")
def reset_engineer_password(
    id: int,
    request: Request,
    body: AdminResetPasswordRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin overrides engineer's password."""
    client_ip = get_client_ip(request)
    engineer_service.reset_password(
        db=db,
        engineer_id=id,
        new_password=body.new_password,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return MessageResponse(success=True, message="Engineer password reset successfully.")


# =====================================================================
# 2. Work Logs Administration & Rich Filtering Endpoints
# =====================================================================

@router.get("/work-logs", response_model=PaginatedResponse[WorkLogResponse], summary="List work logs with database multi-filtering (Admin)")
def list_admin_work_logs(
    engineer_id: Optional[int] = Query(None, description="Filter by engineer ID"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    work_type_id: Optional[int] = Query(None, description="Filter by work type ID"),
    status_id: Optional[int] = Query(None, description="Filter by work status ID"),
    date_from: Optional[date] = Query(None, description="Filter logs starting from date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter logs up to date (YYYY-MM-DD)"),
    min_hours: Optional[Decimal] = Query(None, description="Filter by minimum hours"),
    max_hours: Optional[Decimal] = Query(None, description="Filter by maximum hours"),
    engineer_is_active: Optional[bool] = Query(None, description="Filter by engineer active status"),
    pagination: PaginationParams = Depends(get_pagination),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Query work logs with multi-parameter database-level filtering."""
    return work_log_service.list_work_logs(
        db=db,
        page=pagination.page,
        page_size=pagination.page_size,
        engineer_id=engineer_id,
        department_id=department_id,
        project_id=project_id,
        work_type_id=work_type_id,
        work_status_id=status_id,
        date_from=date_from,
        date_to=date_to,
        min_hours=min_hours,
        max_hours=max_hours,
        engineer_is_active=engineer_is_active,
    )


@router.post("/work-logs", response_model=WorkLogResponse, status_code=201, summary="Create a work log on behalf of an engineer (Admin)")
def create_admin_work_log(
    request: Request,
    body: WorkLogAdminCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin creates a work log on behalf of an engineer."""
    client_ip = get_client_ip(request)
    log_data = WorkLogCreate(
        work_date=body.work_date,
        project_id=body.project_id,
        hours=body.hours,
        work_type_id=body.work_type_id,
        work_status_id=body.work_status_id,
        notes=body.notes,
    )
    log = work_log_service.create(
        db=db,
        engineer_id=body.engineer_id,
        data=log_data,
        current_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return WorkLogResponse.model_validate(log)


@router.get("/work-logs/{id}", response_model=WorkLogResponse, summary="Get work log by ID (Admin)")
def get_admin_work_log(
    id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get single work log by ID."""
    log = work_log_service.get_by_id(db, id)
    return WorkLogResponse.model_validate(log)


@router.put("/work-logs/{id}", response_model=WorkLogResponse, summary="Update work log (Admin)")
def update_admin_work_log(
    id: int,
    request: Request,
    body: WorkLogUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update work log (Admin can update any log)."""
    client_ip = get_client_ip(request)
    log = work_log_service.update(
        db=db,
        work_log_id=id,
        data=body,
        current_user_id=current_admin.id,
        engineer_id_filter=None,  # No filter for admin
        ip_address=client_ip,
    )
    return WorkLogResponse.model_validate(log)


@router.delete("/work-logs/{id}", response_model=MessageResponse, summary="Delete work log (Admin)")
def delete_admin_work_log(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete work log (Admin can delete any log)."""
    client_ip = get_client_ip(request)
    work_log_service.delete(
        db=db,
        work_log_id=id,
        current_user_id=current_admin.id,
        engineer_id_filter=None,
        ip_address=client_ip,
    )
    return MessageResponse(success=True, message="Work log deleted successfully.")


# =====================================================================
# 3. Audit Logs Endpoints
# =====================================================================

@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogResponse], summary="List audit logs (Admin)")
def list_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (User, Engineer, Project, WorkLog, etc.)"),
    date_from: Optional[datetime] = Query(None, description="Filter starting from timestamp"),
    date_to: Optional[datetime] = Query(None, description="Filter up to timestamp"),
    pagination: PaginationParams = Depends(get_pagination),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Query system audit logs with filters and pagination."""
    return audit_service.get_audit_logs(
        db=db,
        page=pagination.page,
        page_size=pagination.page_size,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        date_from=date_from,
        date_to=date_to,
    )
