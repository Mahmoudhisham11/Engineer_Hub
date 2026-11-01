"""WorkType API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_client_ip, get_current_user, require_admin
from app.models.user import User, UserRole
from app.schemas.common import MessageResponse
from app.schemas.work_type import WorkTypeCreate, WorkTypeResponse, WorkTypeUpdate
from app.services.work_type_service import work_type_service

router = APIRouter(prefix="/work-types", tags=["Work Types"])


@router.get("", response_model=List[WorkTypeResponse], summary="List work types")
def list_work_types(
    active_only: Optional[bool] = Query(None, description="Filter active types only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List work types (active for regular users, all for admin)."""
    should_filter_active = True if current_user.role != UserRole.ADMIN else (active_only if active_only is not None else False)
    work_types = work_type_service.get_all(db, active_only=should_filter_active)
    return [WorkTypeResponse.model_validate(wt) for wt in work_types]


@router.post("", response_model=WorkTypeResponse, status_code=201, summary="Create a work type (Admin)")
def create_work_type(
    request: Request,
    body: WorkTypeCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new work type (Admin only)."""
    client_ip = get_client_ip(request)
    wt = work_type_service.create(
        db=db,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return WorkTypeResponse.model_validate(wt)


@router.get("/{id}", response_model=WorkTypeResponse, summary="Get work type by ID")
def get_work_type(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get work type by ID."""
    wt = work_type_service.get_by_id(db, id)
    return WorkTypeResponse.model_validate(wt)


@router.put("/{id}", response_model=WorkTypeResponse, summary="Update a work type (Admin)")
def update_work_type(
    id: int,
    request: Request,
    body: WorkTypeUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update work type (Admin only)."""
    client_ip = get_client_ip(request)
    wt = work_type_service.update(
        db=db,
        work_type_id=id,
        data=body,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return WorkTypeResponse.model_validate(wt)


@router.delete("/{id}", response_model=MessageResponse, summary="Delete a work type (Admin)")
def delete_work_type(
    id: int,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete work type if no work logs reference it (Admin only)."""
    client_ip = get_client_ip(request)
    work_type_service.delete(
        db=db,
        work_type_id=id,
        admin_user_id=current_admin.id,
        ip_address=client_ip,
    )
    return MessageResponse(success=True, message="Work type deleted successfully.")
