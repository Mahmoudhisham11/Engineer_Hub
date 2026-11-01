"""WorkStatus API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_client_ip, get_current_user, require_admin
from app.models.user import User, UserRole
from app.schemas.common import MessageResponse
from app.schemas.work_status import WorkStatusCreate, WorkStatusResponse, WorkStatusUpdate
from app.services.work_status_service import work_status_service

router = APIRouter(prefix="/work-statuses", tags=["Work Statuses"])


@router.get("", response_model=List[WorkStatusResponse], summary="List work statuses")
def list_work_statuses(
    active_only: Optional[bool] = Query(None, description="Filter active statuses only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List work statuses (active for regular users, all for admin)."""
    should_filter_active = True if current_user.role != UserRole.ADMIN else (active_only if active_only is not None else False)
    work_statuses = work_status_service.get_all(db, active_only=should_filter_active)
    return [WorkStatusResponse.model_validate(ws) for ws in work_statuses]


@router.post("", response_model=WorkStatusResponse, status_code=201, summary="Create a work status (Admin)")
def create_work_status(
    request: Request,
    body: WorkStatusCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new work status (Admin only)."""
    client_ip = get_client_ip(request)
    ws = work_status_service.create(
        db=db,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return WorkStatusResponse.model_validate(ws)


@router.get("/{id}", response_model=WorkStatusResponse, summary="Get work status by ID")
def get_work_status(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get work status by ID."""
    ws = work_status_service.get_by_id(db, id)
    return WorkStatusResponse.model_validate(ws)


@router.put("/{id}", response_model=WorkStatusResponse, summary="Update a work status (Admin)")
def update_work_status(
    id: int,
    request: Request,
    body: WorkStatusUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update work status (Admin only)."""
    client_ip = get_client_ip(request)
    ws = work_status_service.update(
        db=db,
        work_status_id=id,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return WorkStatusResponse.model_validate(ws)


@router.delete("/{id}", response_model=MessageResponse, summary="Delete a work status (Admin)")
def delete_work_status(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete work status if no work logs reference it (Admin only)."""
    client_ip = get_client_ip(request)
    work_status_service.delete(
        db=db,
        work_status_id=id,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return MessageResponse(success=True, message="Work status deleted successfully.")
