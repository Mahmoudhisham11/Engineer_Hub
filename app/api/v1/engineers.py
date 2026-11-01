"""Engineer Self-Service API endpoints."""

from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_client_ip, get_current_engineer, get_pagination
from app.core.exceptions import PermissionDeniedError
from app.models.engineer import Engineer
from app.schemas.analytics import EngineerStatsResponse
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.engineer import EngineerResponse, EngineerSelfUpdate
from app.schemas.work_log import WorkLogCreate, WorkLogResponse, WorkLogUpdate
from app.services.analytics_service import analytics_service
from app.services.engineer_service import engineer_service
from app.services.work_log_service import work_log_service
from app.utils.pagination import PaginationParams

router = APIRouter(prefix="/engineers", tags=["Engineers"])


@router.get("/me", response_model=EngineerResponse, summary="Get own engineer profile")
def get_my_engineer_profile(
    current_engineer: Engineer = Depends(get_current_engineer),
):
    """Retrieve the authenticated engineer's profile."""
    return EngineerResponse.model_validate(current_engineer)


@router.put("/me", response_model=EngineerResponse, summary="Update own profile")
def update_my_engineer_profile(
    request: Request,
    body: EngineerSelfUpdate,
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db),
):
    """Update engineer self information (e.g. full name)."""
    client_ip = get_client_ip(request)
    if body.full_name:
        current_engineer.full_name = body.full_name.strip()
        db.add(current_engineer)
        db.commit()
        db.refresh(current_engineer)
    return EngineerResponse.model_validate(current_engineer)


@router.get("/me/work-logs", response_model=PaginatedResponse[WorkLogResponse], summary="List own work logs")
def get_my_work_logs(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    work_type_id: Optional[int] = Query(None, description="Filter by work type ID"),
    work_status_id: Optional[int] = Query(None, description="Filter by work status ID"),
    date_from: Optional[date] = Query(None, description="Filter logs starting from this date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter logs up to this date (YYYY-MM-DD)"),
    min_hours: Optional[Decimal] = Query(None, description="Filter logs with minimum hours"),
    max_hours: Optional[Decimal] = Query(None, description="Filter logs with maximum hours"),
    pagination: PaginationParams = Depends(get_pagination),
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db),
):
    """List paginated work logs belonging to the current engineer."""
    return work_log_service.list_work_logs(
        db=db,
        page=pagination.page,
        page_size=pagination.page_size,
        engineer_id=current_engineer.id,
        project_id=project_id,
        work_type_id=work_type_id,
        work_status_id=work_status_id,
        date_from=date_from,
        date_to=date_to,
        min_hours=min_hours,
        max_hours=max_hours,
    )


@router.post("/me/work-logs", response_model=WorkLogResponse, status_code=201, summary="Create a new work log")
def create_my_work_log(
    request: Request,
    body: WorkLogCreate,
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db),
):
    """Create a work log entry for the current engineer."""
    client_ip = get_client_ip(request)
    log = work_log_service.create(
        db=db,
        engineer_id=current_engineer.id,
        data=body,
        current_user_id=current_engineer.user_id,
        ip_address=client_ip,
    )
    return WorkLogResponse.model_validate(log)


@router.get("/me/work-logs/{id}", response_model=WorkLogResponse, summary="Get a specific work log")
def get_my_work_log(
    id: int,
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db),
):
    """Get single work log by ID (IDOR protected: must belong to current engineer)."""
    log = work_log_service.get_by_id(db, id)
    if log.engineer_id != current_engineer.id:
        raise PermissionDeniedError("You are not authorized to view this work log.")
    return WorkLogResponse.model_validate(log)


@router.put("/me/work-logs/{id}", response_model=WorkLogResponse, summary="Update an existing work log")
def update_my_work_log(
    id: int,
    request: Request,
    body: WorkLogUpdate,
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db),
):
    """Update a work log entry belonging to the current engineer."""
    client_ip = get_client_ip(request)
    log = work_log_service.update(
        db=db,
        work_log_id=id,
        data=body,
        current_user_id=current_engineer.user_id,
        engineer_id_filter=current_engineer.id,
        ip_address=client_ip,
    )
    return WorkLogResponse.model_validate(log)


@router.delete("/me/work-logs/{id}", response_model=MessageResponse, summary="Delete a work log")
def delete_my_work_log(
    id: int,
    request: Request,
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db),
):
    """Delete a work log entry belonging to the current engineer."""
    client_ip = get_client_ip(request)
    work_log_service.delete(
        db=db,
        work_log_id=id,
        current_user_id=current_engineer.user_id,
        engineer_id_filter=current_engineer.id,
        ip_address=client_ip,
    )
    return MessageResponse(success=True, message="Work log deleted successfully.")


@router.get("/me/statistics", response_model=EngineerStatsResponse, summary="Get own statistics & summary")
def get_my_statistics(
    date_from: Optional[date] = Query(None, description="Filter starting from this date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter up to this date (YYYY-MM-DD)"),
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db),
):
    """Get summarized hours, distribution by project, type, status, and time series for current engineer."""
    return analytics_service.get_engineer_stats(
        db=db,
        engineer_id=current_engineer.id,
        date_from=date_from,
        date_to=date_to,
    )
