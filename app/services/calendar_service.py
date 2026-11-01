"""Working Calendar & Business Rule Validation Service."""

from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional, Set
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.exceptions import MaxHoursExceededError, NonWorkingDayError
from app.models.work_log import WorkLog


class WorkingCalendarService:
    """Centralized service for working calendar, weekend and hours validation."""

    def __init__(self):
        # Default non-working weekdays (4 = Friday, 5 = Saturday where Monday = 0)
        self.non_working_weekdays: Set[int] = set(settings.non_working_weekdays)
        self.max_daily_hours: Decimal = Decimal(str(settings.MAX_DAILY_WORK_HOURS))

    def is_working_day(self, target_date: date) -> bool:
        """Check if a given date is a working day."""
        # 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
        weekday = target_date.weekday()
        if weekday in self.non_working_weekdays:
            return False
        # Future extensibility: check company holiday database table here
        return True

    def validate_working_day(self, target_date: date) -> None:
        """Validate date is a working day, raising NonWorkingDayError if not."""
        if not self.is_working_day(target_date):
            day_name = target_date.strftime("%A")
            raise NonWorkingDayError(
                message=f"Work logs cannot be created on {day_name} ({target_date.isoformat()}), as it is a non-working company day.",
                details={"date": target_date.isoformat(), "day_of_week": day_name},
            )

    def validate_daily_hours(
        self,
        db: Session,
        engineer_id: int,
        work_date: date,
        new_hours: Decimal,
        exclude_work_log_id: Optional[int] = None,
    ) -> None:
        """Validate that total logged hours for the engineer on target_date do not exceed maximum."""
        if new_hours <= 0:
            raise MaxHoursExceededError("Work hours must be greater than 0.")

        query = select(func.coalesce(func.sum(WorkLog.hours), 0)).where(
            WorkLog.engineer_id == engineer_id,
            WorkLog.work_date == work_date,
        )

        if exclude_work_log_id:
            query = query.where(WorkLog.id != exclude_work_log_id)

        existing_hours = db.execute(query).scalar_one()
        existing_hours_dec = Decimal(str(existing_hours))
        total_hours = existing_hours_dec + new_hours

        if total_hours > self.max_daily_hours:
            raise MaxHoursExceededError(
                message=(
                    f"Total logged hours ({total_hours:.2f}h) on {work_date.isoformat()} "
                    f"would exceed maximum allowed daily limit of {self.max_daily_hours:.2f}h. "
                    f"Already logged: {existing_hours_dec:.2f}h."
                ),
                details={
                    "work_date": work_date.isoformat(),
                    "existing_hours": float(existing_hours_dec),
                    "attempted_hours": float(new_hours),
                    "max_daily_hours": float(self.max_daily_hours),
                },
            )

    def count_working_days(self, start_date: date, end_date: date) -> int:
        """Count working days between two dates inclusive."""
        if start_date > end_date:
            return 0
        working_days = 0
        cur = start_date
        while cur <= end_date:
            if self.is_working_day(cur):
                working_days += 1
            cur += timedelta(days=1)
        return working_days


calendar_service = WorkingCalendarService()
