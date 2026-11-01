"""Engineer SQLAlchemy Model."""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Engineer(Base, TimestampMixin):
    __tablename__ = "engineers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    employee_code = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(150), index=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), index=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="engineer")
    department = relationship("Department", back_populates="engineers")
    work_logs = relationship("WorkLog", back_populates="engineer", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Engineer id={self.id} code='{self.employee_code}' name='{self.full_name}'>"
