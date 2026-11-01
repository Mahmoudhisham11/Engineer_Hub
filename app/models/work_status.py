"""WorkStatus SQLAlchemy Model."""

from sqlalchemy import Boolean, Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class WorkStatus(Base, TimestampMixin):
    __tablename__ = "work_statuses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    work_logs = relationship("WorkLog", back_populates="work_status")

    def __repr__(self) -> str:
        return f"<WorkStatus id={self.id} name='{self.name}'>"
