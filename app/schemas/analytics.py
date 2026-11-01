"""Analytics Pydantic Schemas."""

from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import Field
from app.schemas.common import BaseSchema


class KeyValueMetric(BaseSchema):
    id: int
    name: str
    hours: Decimal
    percentage: Optional[float] = None
    count: Optional[int] = None


class TimeSeriesPoint(BaseSchema):
    period: str  # e.g., '2026-09-01', '2026-W36', '2026-09'
    hours: Decimal
    logs_count: int


# 1. Overall Statistics
class OverallStatsResponse(BaseSchema):
    total_engineers: int
    active_engineers: int
    inactive_engineers: int
    total_projects: int
    active_projects: int
    total_departments: int
    total_work_logs: int
    total_hours: Decimal
    average_hours_per_engineer: Decimal
    average_hours_per_working_day: Decimal


# 2. Engineer Statistics
class EngineerStatsResponse(BaseSchema):
    engineer_id: int
    full_name: str
    employee_code: str
    department_name: str
    total_hours: Decimal
    total_work_logs: int
    active_working_days_count: int
    average_daily_hours: Decimal
    hours_by_project: List[KeyValueMetric]
    hours_by_work_type: List[KeyValueMetric]
    hours_by_status: List[KeyValueMetric]
    daily_hours: List[TimeSeriesPoint]
    weekly_hours: List[TimeSeriesPoint]
    monthly_hours: List[TimeSeriesPoint]


# 3. Department Statistics
class DepartmentMetric(BaseSchema):
    department_id: int
    department_name: str
    total_engineers: int
    active_engineers: int
    total_hours: Decimal
    average_hours_per_engineer: Decimal
    project_distribution: List[KeyValueMetric]


class DepartmentStatsResponse(BaseSchema):
    departments: List[DepartmentMetric]


# 4. Project Statistics
class ProjectMetric(BaseSchema):
    project_id: int
    project_name: str
    project_code: str
    is_active: bool
    total_hours: Decimal
    engineers_count: int
    work_logs_count: int
    hours_over_time: List[TimeSeriesPoint]


class ProjectStatsResponse(BaseSchema):
    projects: List[ProjectMetric]


# 5. Engineer-Project Allocation Matrix
class EngineerProjectAllocation(BaseSchema):
    project_id: int
    project_name: str
    project_code: str
    hours: Decimal
    percentage_of_logged: float = 0.0  # % of total hours logged by this engineer in period
    percentage_of_capacity: float = 0.0  # % of standard period capacity (working days * 8h)


class EngineerMatrixRow(BaseSchema):
    engineer_id: int
    full_name: str
    employee_code: str
    department_id: Optional[int] = None
    department_name: str
    is_active: bool
    total_hours: Decimal
    active_days_count: int
    capacity_percentage: float = 0.0  # (total_hours / expected_period_hours) * 100
    allocations: Dict[int, EngineerProjectAllocation] = {}  # keyed by project_id


class ProjectMatrixColumn(BaseSchema):
    project_id: int
    name: str
    project_code: str
    is_active: bool
    total_hours: Decimal
    engineers_count: int


class WorkingDaysSummary(BaseSchema):
    start_date: str
    end_date: str
    total_calendar_days: int
    working_days_count: int  # excluding Friday (4) and Saturday (5)
    weekend_days_count: int
    expected_hours_per_engineer: Decimal  # working_days_count * 8.0h


class EngineerProjectMatrixResponse(BaseSchema):
    period_summary: WorkingDaysSummary
    projects: List[ProjectMatrixColumn]
    rows: List[EngineerMatrixRow]
    overall_total_hours: Decimal
    active_engineers_count: int
    active_projects_count: int
