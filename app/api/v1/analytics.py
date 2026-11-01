"""Admin Analytics API endpoints."""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.analytics import (
    DepartmentStatsResponse,
    EngineerProjectMatrixResponse,
    EngineerStatsResponse,
    OverallStatsResponse,
    ProjectStatsResponse,
)
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/admin/analytics", tags=["Analytics"])


@router.get("/overview", response_model=OverallStatsResponse, summary="Get overall platform statistics (Admin)")
def get_overview_statistics(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retrieve high-level KPIs including engineer counts, project counts, total hours, and averages."""
    return analytics_service.get_overall_stats(db)


@router.get("/matrix", response_model=EngineerProjectMatrixResponse, summary="Get Engineer-Project Allocation Matrix (Admin)")
def get_engineer_project_matrix(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format (e.g. '2026-09')"),
    date_from: Optional[date] = Query(None, description="Filter starting from this date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter up to this date (YYYY-MM-DD)"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retrieve multi-dimensional Engineer-Project allocation matrix with working days calculations and percentages."""
    return analytics_service.get_engineer_project_matrix(
        db=db,
        month=month,
        date_from=date_from,
        date_to=date_to,
        department_id=department_id,
    )


@router.get("/matrix/export", summary="Export Engineer-Project Matrix to Excel (Admin)")
def export_matrix_to_excel(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format (e.g. '2026-09')"),
    date_from: Optional[date] = Query(None, description="Filter starting from this date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter up to this date (YYYY-MM-DD)"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Export the Engineer-Project Allocation Matrix as a styled Excel (.xlsx) file."""
    excel_bytes = analytics_service.export_matrix_to_excel(
        db=db,
        month=month,
        date_from=date_from,
        date_to=date_to,
        department_id=department_id,
    )

    filename_suffix = month or (f"{date_from}_to_{date_to}" if date_from and date_to else date.today().strftime("%Y-%m"))
    filename = f"EngineerHub_Allocation_Matrix_{filename_suffix}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get("/engineers/{id}", response_model=EngineerStatsResponse, summary="Get individual engineer analytics (Admin)")
def get_engineer_statistics(
    id: int,
    date_from: Optional[date] = Query(None, description="Filter starting from this date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter up to this date (YYYY-MM-DD)"),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retrieve deep dive metrics for a specific engineer."""
    return analytics_service.get_engineer_stats(
        db=db,
        engineer_id=id,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/departments", response_model=DepartmentStatsResponse, summary="Get department statistics (Admin)")
def get_department_statistics(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retrieve department breakdowns, engineer distributions, and hours."""
    return analytics_service.get_department_stats(db)


@router.get("/projects", response_model=ProjectStatsResponse, summary="Get project statistics (Admin)")
def get_project_statistics(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retrieve project hours, engineer counts, and time-series trends."""
    return analytics_service.get_project_stats(db)
