"""Project SQLAlchemy Model."""

from sqlalchemy import Boolean, Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), index=True, nullable=False)
    project_code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    work_logs = relationship("WorkLog", back_populates="project")

    def __repr__(self) -> str:
        return f"<Project id={self.id} code='{self.project_code}' name='{self.name}'>"
