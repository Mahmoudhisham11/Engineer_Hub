"""AuditLog Pydantic Schemas."""

from datetime import datetime
from typing import Any, Dict, Optional
from app.schemas.common import BaseSchema


class AuditLogResponse(BaseSchema):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    timestamp: datetime
    details: Optional[str] = None
    ip_address: Optional[str] = None
