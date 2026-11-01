"""WorkLog SQLAlchemy Model."""

from sqlalchemy import Column, Date, ForeignKey, Index, Integer, Numeric, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class WorkLog(Base, TimestampMixin):
    __tablename__ = "work_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    engineer_id = Column(Integer, ForeignKey("engineers.id", ondelete="CASCADE"), index=True, nullable=False)
    work_date = Column(Date, index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="RESTRICT"), index=True, nullable=False)
    hours = Column(Numeric(4, 2), nullable=False)
    work_type_id = Column(Integer, ForeignKey("work_types.id", ondelete="RESTRICT"), index=True, nullable=False)
    work_status_id = Column(Integer, ForeignKey("work_statuses.id", ondelete="RESTRICT"), index=True, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    engineer = relationship("Engineer", back_populates="work_logs")
    project = relationship("Project", back_populates="work_logs")
    work_type = relationship("WorkType", back_populates="work_logs")
    work_status = relationship("WorkStatus", back_populates="work_logs")

    # Composite Indexes for common query filters and analytics
    __table_args__ = (
        Index("idx_work_log_engineer_date", "engineer_id", "work_date"),
        Index("idx_work_log_date_project", "work_date", "project_id"),
        Index("idx_work_log_engineer_project", "engineer_id", "project_id"),
        Index("idx_work_log_type_status", "work_type_id", "work_status_id"),
    )

    def __repr__(self) -> str:
        return f"<WorkLog id={self.id} engineer_id={self.engineer_id} date='{self.work_date}' hours={self.hours}>"
