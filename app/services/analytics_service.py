"""Admin and Engineer Analytics Service with Database-level Aggregations."""

import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
import io
from typing import Any, Dict, List, Optional
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import case, distinct, func, select
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundError
from app.models.department import Department
from app.models.engineer import Engineer
from app.models.project import Project
from app.models.work_log import WorkLog
from app.models.work_status import WorkStatus
from app.models.work_type import WorkType
from app.schemas.analytics import (
    DepartmentMetric,
    DepartmentStatsResponse,
    EngineerMatrixRow,
    EngineerProjectAllocation,
    EngineerProjectMatrixResponse,
    EngineerStatsResponse,
    KeyValueMetric,
    OverallStatsResponse,
    ProjectMatrixColumn,
    ProjectMetric,
    ProjectStatsResponse,
    TimeSeriesPoint,
    WorkingDaysSummary,
)


class AnalyticsService:
    @staticmethod
    def get_overall_stats(db: Session) -> OverallStatsResponse:
        """Compute high-level KPIs across the entire system."""
        # Engineers counts
        total_eng = db.execute(select(func.count(Engineer.id))).scalar_one() or 0
        active_eng = db.execute(
            select(func.count(Engineer.id)).where(Engineer.is_active.is_(True))
        ).scalar_one() or 0
        inactive_eng = total_eng - active_eng

        # Projects counts
        total_proj = db.execute(select(func.count(Project.id))).scalar_one() or 0
        active_proj = db.execute(
            select(func.count(Project.id)).where(Project.is_active.is_(True))
        ).scalar_one() or 0

        # Departments count
        total_dept = db.execute(select(func.count(Department.id))).scalar_one() or 0

        # Work logs summary
        work_logs_summary = db.execute(
            select(
                func.count(WorkLog.id),
                func.coalesce(func.sum(WorkLog.hours), 0),
                func.count(distinct(WorkLog.work_date)),
            )
        ).one()

        total_logs = work_logs_summary[0]
        total_hours = Decimal(str(work_logs_summary[1]))
        distinct_days = work_logs_summary[2]

        avg_hours_per_eng = (
            round(total_hours / Decimal(str(total_eng)), 2)
            if total_eng > 0
            else Decimal("0.00")
        )
        avg_hours_per_day = (
            round(total_hours / Decimal(str(distinct_days)), 2)
            if distinct_days > 0
            else Decimal("0.00")
        )

        return OverallStatsResponse(
            total_engineers=total_eng,
            active_engineers=active_eng,
            inactive_engineers=inactive_eng,
            total_projects=total_proj,
            active_projects=active_proj,
            total_departments=total_dept,
            total_work_logs=total_logs,
            total_hours=total_hours,
            average_hours_per_engineer=avg_hours_per_eng,
            average_hours_per_working_day=avg_hours_per_day,
        )

    @staticmethod
    def get_engineer_stats(
        db: Session,
        engineer_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> EngineerStatsResponse:
        """Compute detailed performance and time distribution statistics for a specific engineer."""
        engineer = db.get(Engineer, engineer_id)
        if not engineer:
            raise NotFoundError(f"Engineer with ID {engineer_id} not found.")

        dept_name = engineer.department.name if engineer.department else "Unassigned"

        base_filter = [WorkLog.engineer_id == engineer_id]
        if date_from:
            base_filter.append(WorkLog.work_date >= date_from)
        if date_to:
            base_filter.append(WorkLog.work_date <= date_to)

        # 1. Total hours, logs count, distinct days
        summary = db.execute(
            select(
                func.coalesce(func.sum(WorkLog.hours), 0),
                func.count(WorkLog.id),
                func.count(distinct(WorkLog.work_date)),
            ).where(*base_filter)
        ).one()

        total_hours = Decimal(str(summary[0]))
        total_logs = summary[1]
        active_days = summary[2]

        avg_daily = (
            round(total_hours / Decimal(str(active_days)), 2)
            if active_days > 0
            else Decimal("0.00")
        )

        # 2. Hours by Project
        project_rows = db.execute(
            select(
                Project.id,
                Project.name,
                func.coalesce(func.sum(WorkLog.hours), 0),
                func.count(WorkLog.id),
            )
            .join(Project, WorkLog.project_id == Project.id)
            .where(*base_filter)
            .group_by(Project.id, Project.name)
            .order_by(func.sum(WorkLog.hours).desc())
        ).all()

        hours_by_project = [
            KeyValueMetric(
                id=r[0],
                name=r[1],
                hours=Decimal(str(r[2])),
                percentage=round(float(Decimal(str(r[2])) / total_hours * 100), 2)
                if total_hours > 0
                else 0.0,
                count=r[3],
            )
            for r in project_rows
        ]

        # 3. Hours by Work Type
        type_rows = db.execute(
            select(
                WorkType.id,
                WorkType.name,
                func.coalesce(func.sum(WorkLog.hours), 0),
                func.count(WorkLog.id),
            )
            .join(WorkType, WorkLog.work_type_id == WorkType.id)
            .where(*base_filter)
            .group_by(WorkType.id, WorkType.name)
            .order_by(func.sum(WorkLog.hours).desc())
        ).all()

        hours_by_type = [
            KeyValueMetric(
                id=r[0],
                name=r[1],
                hours=Decimal(str(r[2])),
                percentage=round(float(Decimal(str(r[2])) / total_hours * 100), 2)
                if total_hours > 0
                else 0.0,
                count=r[3],
            )
            for r in type_rows
        ]

        # 4. Hours by Status
        status_rows = db.execute(
            select(
                WorkStatus.id,
                WorkStatus.name,
                func.coalesce(func.sum(WorkLog.hours), 0),
                func.count(WorkLog.id),
            )
            .join(WorkStatus, WorkLog.work_status_id == WorkStatus.id)
            .where(*base_filter)
            .group_by(WorkStatus.id, WorkStatus.name)
            .order_by(func.sum(WorkLog.hours).desc())
        ).all()

        hours_by_status = [
            KeyValueMetric(
                id=r[0],
                name=r[1],
                hours=Decimal(str(r[2])),
                percentage=round(float(Decimal(str(r[2])) / total_hours * 100), 2)
                if total_hours > 0
                else 0.0,
                count=r[3],
            )
            for r in status_rows
        ]

        # 5. Time series (daily, weekly, monthly)
        time_series_rows = db.execute(
            select(
                WorkLog.work_date,
                func.coalesce(func.sum(WorkLog.hours), 0),
                func.count(WorkLog.id),
            )
            .where(*base_filter)
            .group_by(WorkLog.work_date)
            .order_by(WorkLog.work_date.asc())
        ).all()

        daily_map: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"hours": Decimal("0.00"), "count": 0})
        weekly_map: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"hours": Decimal("0.00"), "count": 0})
        monthly_map: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"hours": Decimal("0.00"), "count": 0})

        for r in time_series_rows:
            d_val: date = r[0]
            d_str = d_val.isoformat()
            w_str = f"{d_val.isocalendar()[0]}-W{d_val.isocalendar()[1]:02d}"
            m_str = d_val.strftime("%Y-%m")

            h_val = Decimal(str(r[1]))
            c_val = r[2]

            daily_map[d_str]["hours"] += h_val
            daily_map[d_str]["count"] += c_val

            weekly_map[w_str]["hours"] += h_val
            weekly_map[w_str]["count"] += c_val

            monthly_map[m_str]["hours"] += h_val
            monthly_map[m_str]["count"] += c_val

        daily_points = [
            TimeSeriesPoint(period=k, hours=v["hours"], logs_count=v["count"])
            for k, v in sorted(daily_map.items())
        ]
        weekly_points = [
            TimeSeriesPoint(period=k, hours=v["hours"], logs_count=v["count"])
            for k, v in sorted(weekly_map.items())
        ]
        monthly_points = [
            TimeSeriesPoint(period=k, hours=v["hours"], logs_count=v["count"])
            for k, v in sorted(monthly_map.items())
        ]

        return EngineerStatsResponse(
            engineer_id=engineer.id,
            full_name=engineer.full_name,
            employee_code=engineer.employee_code,
            department_name=dept_name,
            total_hours=total_hours,
            total_work_logs=total_logs,
            active_working_days_count=active_days,
            average_daily_hours=avg_daily,
            hours_by_project=hours_by_project,
            hours_by_work_type=hours_by_type,
            hours_by_status=hours_by_status,
            daily_hours=daily_points,
            weekly_hours=weekly_points,
            monthly_hours=monthly_points,
        )

    @staticmethod
    def get_department_stats(db: Session) -> DepartmentStatsResponse:
        """Compute aggregated statistics grouped by department."""
        departments = db.execute(select(Department).order_by(Department.name.asc())).scalars().all()

        dept_metrics: List[DepartmentMetric] = []
        for d in departments:
            # Engineers in department
            eng_summary = db.execute(
                select(
                    func.count(Engineer.id),
                    func.count(case((Engineer.is_active.is_(True), 1))),
                ).where(Engineer.department_id == d.id)
            ).one()

            total_eng = eng_summary[0] or 0
            active_eng = eng_summary[1] or 0

            # Hours logged by department engineers
            hours_summary = db.execute(
                select(
                    func.coalesce(func.sum(WorkLog.hours), 0),
                )
                .join(Engineer, WorkLog.engineer_id == Engineer.id)
                .where(Engineer.department_id == d.id)
            ).scalar_one()

            total_hours = Decimal(str(hours_summary or 0))
            avg_hours = (
                round(total_hours / Decimal(str(total_eng)), 2)
                if total_eng > 0
                else Decimal("0.00")
            )

            # Project distribution for department
            proj_rows = db.execute(
                select(
                    Project.id,
                    Project.name,
                    func.coalesce(func.sum(WorkLog.hours), 0),
                )
                .join(Project, WorkLog.project_id == Project.id)
                .join(Engineer, WorkLog.engineer_id == Engineer.id)
                .where(Engineer.department_id == d.id)
                .group_by(Project.id, Project.name)
                .order_by(func.sum(WorkLog.hours).desc())
            ).all()

            proj_dist = [
                KeyValueMetric(
                    id=r[0],
                    name=r[1],
                    hours=Decimal(str(r[2])),
                    percentage=round(float(Decimal(str(r[2])) / total_hours * 100), 2)
                    if total_hours > 0
                    else 0.0,
                )
                for r in proj_rows
            ]

            dept_metrics.append(
                DepartmentMetric(
                    department_id=d.id,
                    department_name=d.name,
                    total_engineers=total_eng,
                    active_engineers=active_eng,
                    total_hours=total_hours,
                    average_hours_per_engineer=avg_hours,
                    project_distribution=proj_dist,
                )
            )

        return DepartmentStatsResponse(departments=dept_metrics)

    @staticmethod
    def get_project_stats(db: Session) -> ProjectStatsResponse:
        """Compute aggregated statistics for all projects."""
        projects = db.execute(select(Project).order_by(Project.name.asc())).scalars().all()

        project_metrics: List[ProjectMetric] = []
        for p in projects:
            summary = db.execute(
                select(
                    func.coalesce(func.sum(WorkLog.hours), 0),
                    func.count(distinct(WorkLog.engineer_id)),
                    func.count(WorkLog.id),
                ).where(WorkLog.project_id == p.id)
            ).one()

            total_hours = Decimal(str(summary[0]))
            engineers_count = summary[1]
            work_logs_count = summary[2]

            # Hours over time grouped by month
            time_rows = db.execute(
                select(
                    WorkLog.work_date,
                    func.coalesce(func.sum(WorkLog.hours), 0),
                    func.count(WorkLog.id),
                )
                .where(WorkLog.project_id == p.id)
                .group_by(WorkLog.work_date)
                .order_by(WorkLog.work_date.asc())
            ).all()

            monthly_map: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"hours": Decimal("0.00"), "count": 0})
            for r in time_rows:
                m_key = r[0].strftime("%Y-%m")
                monthly_map[m_key]["hours"] += Decimal(str(r[1]))
                monthly_map[m_key]["count"] += r[2]

            hours_over_time = [
                TimeSeriesPoint(period=k, hours=v["hours"], logs_count=v["count"])
                for k, v in sorted(monthly_map.items())
            ]

            project_metrics.append(
                ProjectMetric(
                    project_id=p.id,
                    project_name=p.name,
                    project_code=p.project_code,
                    is_active=p.is_active,
                    total_hours=total_hours,
                    engineers_count=engineers_count,
                    work_logs_count=work_logs_count,
                    hours_over_time=hours_over_time,
                )
            )

        return ProjectStatsResponse(projects=project_metrics)

    @staticmethod
    def get_engineer_project_matrix(
        db: Session,
        month: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        department_id: Optional[int] = None,
    ) -> EngineerProjectMatrixResponse:
        """Compute the interactive Engineer-Project allocation matrix for a specified month or date range.

        Working Days Calculation:
        - 5 working days per week: Sunday, Monday, Tuesday, Wednesday, Thursday
        - Company weekends: Friday (weekday 4) and Saturday (weekday 5) are excluded
        - Standard working capacity = working_days_count * 8.0 hours
        """
        today = date.today()
        if month:
            try:
                parts = month.split("-")
                year_num = int(parts[0])
                month_num = int(parts[1])
                start_d = date(year_num, month_num, 1)
                last_day = calendar.monthrange(year_num, month_num)[1]
                end_d = date(year_num, month_num, last_day)
            except Exception:
                start_d = date(today.year, today.month, 1)
                last_day = calendar.monthrange(today.year, today.month)[1]
                end_d = date(today.year, today.month, last_day)
        elif date_from and date_to:
            start_d = date_from
            end_d = date_to
        elif date_from:
            start_d = date_from
            end_d = today
        else:
            start_d = date(today.year, today.month, 1)
            last_day = calendar.monthrange(today.year, today.month)[1]
            end_d = date(today.year, today.month, last_day)

        if start_d > end_d:
            start_d, end_d = end_d, start_d

        # 1. Calculate Working Days & Capacity (excluding Fridays=4 and Saturdays=5)
        cur = start_d
        total_cal_days = 0
        working_days_count = 0
        weekend_days_count = 0

        while cur <= end_d:
            total_cal_days += 1
            if cur.weekday() in (4, 5):
                weekend_days_count += 1
            else:
                working_days_count += 1
            cur += timedelta(days=1)

        expected_hours_per_engineer = Decimal(str(working_days_count)) * Decimal("8.0")

        period_summary = WorkingDaysSummary(
            start_date=start_d.isoformat(),
            end_date=end_d.isoformat(),
            total_calendar_days=total_cal_days,
            working_days_count=working_days_count,
            weekend_days_count=weekend_days_count,
            expected_hours_per_engineer=expected_hours_per_engineer,
        )

        # 2. Query Engineers
        eng_query = select(Engineer).order_by(Engineer.full_name.asc())
        if department_id:
            eng_query = eng_query.where(Engineer.department_id == department_id)
        all_engineers = db.execute(eng_query).scalars().all()

        # 3. Query All Projects
        proj_query = select(Project).order_by(Project.name.asc())
        all_projects = db.execute(proj_query).scalars().all()

        # 4. Query Work Logs in date range grouped by (engineer_id, project_id)
        matrix_filters = [
            WorkLog.work_date >= start_d,
            WorkLog.work_date <= end_d,
        ]
        if department_id:
            matrix_filters.append(Engineer.department_id == department_id)

        alloc_rows = db.execute(
            select(
                WorkLog.engineer_id,
                WorkLog.project_id,
                func.coalesce(func.sum(WorkLog.hours), 0),
                func.count(distinct(WorkLog.work_date)),
            )
            .join(Engineer, WorkLog.engineer_id == Engineer.id)
            .where(*matrix_filters)
            .group_by(WorkLog.engineer_id, WorkLog.project_id)
        ).all()

        eng_proj_hours: Dict[int, Dict[int, Decimal]] = defaultdict(dict)
        for r in alloc_rows:
            e_id = r[0]
            p_id = r[1]
            h = Decimal(str(r[2]))
            eng_proj_hours[e_id][p_id] = h

        # 5. Query Engineer total days active in period
        eng_days_rows = db.execute(
            select(
                WorkLog.engineer_id,
                func.coalesce(func.sum(WorkLog.hours), 0),
                func.count(distinct(WorkLog.work_date)),
            )
            .join(Engineer, WorkLog.engineer_id == Engineer.id)
            .where(*matrix_filters)
            .group_by(WorkLog.engineer_id)
        ).all()

        eng_totals: Dict[int, Dict[str, Any]] = {}
        for r in eng_days_rows:
            eng_totals[r[0]] = {
                "total_hours": Decimal(str(r[1])),
                "active_days": r[2],
            }

        # 6. Project Column totals
        proj_column_totals: Dict[int, Dict[str, Any]] = defaultdict(lambda: {"hours": Decimal("0.00"), "engineers": set()})
        for r in alloc_rows:
            e_id = r[0]
            p_id = r[1]
            h = Decimal(str(r[2]))
            proj_column_totals[p_id]["hours"] += h
            proj_column_totals[p_id]["engineers"].add(e_id)

        project_columns: List[ProjectMatrixColumn] = []
        for p in all_projects:
            p_total = proj_column_totals[p.id]["hours"]
            eng_count = len(proj_column_totals[p.id]["engineers"])
            if p.is_active or p_total > 0:
                project_columns.append(
                    ProjectMatrixColumn(
                        project_id=p.id,
                        name=p.name,
                        project_code=p.project_code,
                        is_active=p.is_active,
                        total_hours=p_total,
                        engineers_count=eng_count,
                    )
                )

        # 7. Build Rows for each Engineer
        rows: List[EngineerMatrixRow] = []
        overall_total_hours = Decimal("0.00")

        for eng in all_engineers:
            eng_data = eng_totals.get(eng.id, {"total_hours": Decimal("0.00"), "active_days": 0})
            e_total_hours = eng_data["total_hours"]
            e_active_days = eng_data["active_days"]
            overall_total_hours += e_total_hours

            cap_pct = (
                round(float(e_total_hours / expected_hours_per_engineer * 100), 1)
                if expected_hours_per_engineer > 0
                else 0.0
            )

            allocations: Dict[int, EngineerProjectAllocation] = {}
            for p_col in project_columns:
                p_id = p_col.project_id
                h = eng_proj_hours.get(eng.id, {}).get(p_id, Decimal("0.00"))

                pct_logged = (
                    round(float(h / e_total_hours * 100), 1)
                    if e_total_hours > 0
                    else 0.0
                )
                pct_cap = (
                    round(float(h / expected_hours_per_engineer * 100), 1)
                    if expected_hours_per_engineer > 0
                    else 0.0
                )

                allocations[p_id] = EngineerProjectAllocation(
                    project_id=p_id,
                    project_name=p_col.name,
                    project_code=p_col.project_code,
                    hours=h,
                    percentage_of_logged=pct_logged,
                    percentage_of_capacity=pct_cap,
                )

            dept_name = eng.department.name if eng.department else "Unassigned"

            rows.append(
                EngineerMatrixRow(
                    engineer_id=eng.id,
                    full_name=eng.full_name,
                    employee_code=eng.employee_code,
                    department_id=eng.department_id,
                    department_name=dept_name,
                    is_active=eng.is_active,
                    total_hours=e_total_hours,
                    active_days_count=e_active_days,
                    capacity_percentage=cap_pct,
                    allocations=allocations,
                )
            )

        active_engs = len([r for r in rows if r.total_hours > 0 or r.is_active])
        active_projs = len([p for p in project_columns if p.total_hours > 0 or p.is_active])

        return EngineerProjectMatrixResponse(
            period_summary=period_summary,
            projects=project_columns,
            rows=rows,
            overall_total_hours=overall_total_hours,
            active_engineers_count=active_engs,
            active_projects_count=active_projs,
        )

    @staticmethod
    def export_matrix_to_excel(
        db: Session,
        month: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        department_id: Optional[int] = None,
    ) -> bytes:
        """Generate a professionally styled Excel spreadsheet (.xlsx) for the Engineer-Project Allocation Matrix."""
        matrix = AnalyticsService.get_engineer_project_matrix(
            db=db,
            month=month,
            date_from=date_from,
            date_to=date_to,
            department_id=department_id,
        )

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Allocation Matrix"

        # Enable grid lines explicitly
        ws.views.sheetView[0].showGridLines = True

        # Styles definition
        font_family = "Segoe UI"
        title_font = Font(name=font_family, size=15, bold=True, color="111827")
        subtitle_font = Font(name=font_family, size=9.5, italic=True, color="64748B")
        banner_font = Font(name=font_family, size=9.5, bold=True, color="0D3844")
        header_font = Font(name=font_family, size=10, bold=True, color="FFFFFF")
        sub_header_font = Font(name=font_family, size=8.5, bold=True, color="94A3B8")
        data_font = Font(name=font_family, size=9.5, color="1E293B")
        bold_data_font = Font(name=font_family, size=9.5, bold=True, color="111827")
        summary_font = Font(name=font_family, size=10, bold=True, color="111827")

        # Fills
        header_fill = PatternFill(start_color="1E1F24", end_color="1E1F24", fill_type="solid")
        banner_fill = PatternFill(start_color="E0F8FD", end_color="E0F8FD", fill_type="solid")
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        white_fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        highlight_fill = PatternFill(start_color="E0F8FD", end_color="E0F8FD", fill_type="solid")
        summary_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

        # Borders
        thin_side = Side(border_style="thin", color="CBD5E1")
        double_side = Side(border_style="double", color="1E1F24")
        thick_top_side = Side(border_style="medium", color="1E1F24")

        cell_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        banner_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        summary_border = Border(left=thin_side, right=thin_side, top=thick_top_side, bottom=double_side)

        # Alignments
        align_left = Alignment(horizontal="left", vertical="center")
        align_center = Alignment(horizontal="center", vertical="center")
        align_right = Alignment(horizontal="right", vertical="center")
        align_wrap_center = Alignment(horizontal="center", vertical="center", wrap_text=True)

        num_cols = len(matrix.projects) + 6  # Name, Code, Dept, Days, [Projects...], Total Hours, Capacity %
        last_col_letter = get_column_letter(num_cols)

        # 1. Title Banner
        ws.merge_cells(f"A1:{last_col_letter}1")
        ws["A1"] = "EngineerHub — DME Technical Office Management"
        ws["A1"].font = title_font
        ws["A1"].alignment = align_left
        ws.row_dimensions[1].height = 24

        ws.merge_cells(f"A2:{last_col_letter}2")
        ws["A2"] = "Engineer-Project Workload & Allocation Matrix"
        ws["A2"].font = subtitle_font
        ws["A2"].alignment = align_left
        ws.row_dimensions[2].height = 18

        # 2. Period & Working Days Summary Banner
        p = matrix.period_summary
        period_text = (
            f"  📅 Period: {p.start_date} to {p.end_date}  |  "
            f"💼 Working Days: {p.working_days_count} Days ({p.weekend_days_count} Fri/Sat Off)  |  "
            f"⏱ Expected Capacity: {p.expected_hours_per_engineer:.1f} hrs / Engineer  |  "
            f"👥 Total Team Logged: {matrix.overall_total_hours:.1f} hrs"
        )
        ws.merge_cells(f"A3:{last_col_letter}3")
        ws["A3"] = period_text
        ws["A3"].font = banner_font
        ws["A3"].fill = banner_fill
        ws["A3"].alignment = align_left
        ws["A3"].border = banner_border
        ws.row_dimensions[3].height = 24

        # Blank Row 4
        ws.row_dimensions[4].height = 10

        # 3. Table Headers (Row 5)
        headers = [
            ("Engineer Name", align_left),
            ("Employee Code", align_center),
            ("Department", align_left),
            ("Days Logged", align_center),
        ]

        for proj in matrix.projects:
            header_text = f"{proj.project_code}\n{proj.name}"
            headers.append((header_text, align_wrap_center))

        headers.append(("Total Logged\n(hrs)", align_right))
        headers.append(("Capacity\nUtilization (%)", align_center))

        ws.row_dimensions[5].height = 32

        for col_idx, (h_text, h_align) in enumerate(headers, 1):
            cell = ws.cell(row=5, column=col_idx, value=h_text)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = h_align
            cell.border = cell_border

        # 4. Data Rows (Starting Row 6)
        current_row = 6
        for row_data in matrix.rows:
            ws.row_dimensions[current_row].height = 22
            row_fill = zebra_fill if (current_row % 2 == 1) else white_fill

            # Engineer details
            days_str = f"{row_data.active_days_count} / {p.working_days_count} d"
            row_values = [
                (row_data.full_name, bold_data_font, align_left, row_fill),
                (row_data.employee_code, data_font, align_center, row_fill),
                (row_data.department_name, data_font, align_left, row_fill),
                (days_str, data_font, align_center, row_fill),
            ]

            # Project allocations
            for proj in matrix.projects:
                alloc = row_data.allocations.get(proj.project_id) or row_data.allocations.get(str(proj.project_id))
                h = float(alloc.hours) if alloc else 0.0
                pct = alloc.percentage_of_logged if alloc else 0.0

                if h > 0:
                    val_str = f"{h:.1f}h ({pct:.0f}%)"
                    cell_fill = highlight_fill if pct >= 40 else row_fill
                    f_color = "0284C7" if pct >= 40 else "111827"
                    p_font = Font(name=font_family, size=9.5, bold=(pct >= 40), color=f_color)
                    row_values.append((val_str, p_font, align_right, cell_fill))
                else:
                    row_values.append(("—", Font(name=font_family, size=9.5, color="94A3B8"), align_center, row_fill))

            # Total Logged & Capacity %
            tot_str = f"{float(row_data.total_hours):.1f} hrs"
            row_values.append((tot_str, bold_data_font, align_right, row_fill))

            cap_pct = row_data.capacity_percentage
            cap_str = f"{cap_pct:.1f}%"
            cap_color = "047857" if (90 <= cap_pct <= 110) else "0284C7" if (cap_pct > 110) else "D97706" if cap_pct > 0 else "94A3B8"
            cap_font = Font(name=font_family, size=9.5, bold=True, color=cap_color)
            row_values.append((cap_str, cap_font, align_center, row_fill))

            for col_idx, (val, cell_font, cell_align, cell_f) in enumerate(row_values, 1):
                c = ws.cell(row=current_row, column=col_idx, value=val)
                c.font = cell_font
                c.alignment = cell_align
                c.fill = cell_f
                c.border = cell_border

            current_row += 1

        # 5. Summary Footer Row
        ws.row_dimensions[current_row].height = 26
        ws.merge_cells(f"A{current_row}:D{current_row}")
        ws[f"A{current_row}"] = f"Team Summary ({len(matrix.rows)} Engineers)"
        ws[f"A{current_row}"].font = summary_font
        ws[f"A{current_row}"].alignment = align_left
        ws[f"A{current_row}"].fill = summary_fill
        ws[f"A{current_row}"].border = summary_border

        for c_idx in range(2, 5):
            ws.cell(row=current_row, column=c_idx).border = summary_border
            ws.cell(row=current_row, column=c_idx).fill = summary_fill

        col_pos = 5
        for proj in matrix.projects:
            tot_cell = ws.cell(row=current_row, column=col_pos, value=f"{float(proj.total_hours):.1f} hrs")
            tot_cell.font = Font(name=font_family, size=9.5, bold=True, color="0284C7")
            tot_cell.alignment = align_right
            tot_cell.fill = summary_fill
            tot_cell.border = summary_border
            col_pos += 1

        grand_cell = ws.cell(row=current_row, column=col_pos, value=f"{float(matrix.overall_total_hours):.1f} hrs")
        grand_cell.font = Font(name=font_family, size=10, bold=True, color="111827")
        grand_cell.alignment = align_right
        grand_cell.fill = summary_fill
        grand_cell.border = summary_border

        pct_cell = ws.cell(row=current_row, column=col_pos + 1, value="100.0%")
        pct_cell.font = Font(name=font_family, size=9.5, bold=True, color="0284C7")
        pct_cell.alignment = align_center
        pct_cell.fill = summary_fill
        pct_cell.border = summary_border

        # 6. Auto-fit column widths with minimum spacing
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                # Skip title & period banner in row 1-3 from width calculation
                if cell.row in (1, 2, 3):
                    continue
                if cell.value:
                    lines = str(cell.value).split("\n")
                    for line in lines:
                        if len(line) > max_len:
                            max_len = len(line)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

        # Save to buffer
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output.getvalue()


analytics_service = AnalyticsService()
