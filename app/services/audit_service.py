"""Audit Log Service."""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse
from app.utils.logger import logger
from app.utils.pagination import paginate_list


class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        user_id: Optional[int] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[Any] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> Optional[AuditLog]:
        """Record an audit log entry."""
        try:
            details_str = json.dumps(details, default=str) if details else None
            audit_entry = AuditLog(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id is not None else None,
                details=details_str,
                ip_address=ip_address,
                timestamp=datetime.now(timezone.utc),
            )
            db.add(audit_entry)
            db.flush()  # Flush as part of current transaction or commit in caller
            return audit_entry
        except Exception as e:
            logger.error(f"Failed to record audit log for action={action}: {e}")
            return None

    @staticmethod
    def get_audit_logs(
        db: Session,
        page: int = 1,
        page_size: int = 25,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> dict:
        """Query audit logs with filtering and pagination."""
        query = select(
            AuditLog.id,
            AuditLog.user_id,
            User.username,
            AuditLog.action,
            AuditLog.entity_type,
            AuditLog.entity_id,
            AuditLog.timestamp,
            AuditLog.details,
            AuditLog.ip_address,
        ).outerjoin(User, AuditLog.user_id == User.id)

        count_query = select(func.count(AuditLog.id))

        if user_id:
            query = query.where(AuditLog.user_id == user_id)
            count_query = count_query.where(AuditLog.user_id == user_id)
        if action:
            query = query.where(AuditLog.action == action)
            count_query = count_query.where(AuditLog.action == action)
        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type)
            count_query = count_query.where(AuditLog.entity_type == entity_type)
        if date_from:
            query = query.where(AuditLog.timestamp >= date_from)
            count_query = count_query.where(AuditLog.timestamp >= date_from)
        if date_to:
            query = query.where(AuditLog.timestamp <= date_to)
            count_query = count_query.where(AuditLog.timestamp <= date_to)

        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(page_size)

        rows = db.execute(query).all()

        items = [
            AuditLogResponse(
                id=row.id,
                user_id=row.user_id,
                username=row.username,
                action=row.action,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                timestamp=row.timestamp,
                details=row.details,
                ip_address=row.ip_address,
            )
            for row in rows
        ]

        return paginate_list(items, total, page, page_size)


audit_service = AuditService()
