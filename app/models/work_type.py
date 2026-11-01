"""WorkType SQLAlchemy Model."""

from sqlalchemy import Boolean, Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class WorkType(Base, TimestampMixin):
    __tablename__ = "work_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    work_logs = relationship("WorkLog", back_populates="work_type")

    def __repr__(self) -> str:
        return f"<WorkType id={self.id} name='{self.name}'>"
