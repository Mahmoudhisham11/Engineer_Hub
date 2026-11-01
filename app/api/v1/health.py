"""Health check API endpoints."""

from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Detailed health check including database")
def api_v1_health(db: Session = Depends(get_db)) -> Dict[str, str]:
    """Verify API and SQLite database connectivity."""
    try:
        result = db.execute(text("PRAGMA journal_mode;")).scalar()
        return {
            "status": "ok",
            "service": "EngineerHub API",
            "database": "connected",
            "journal_mode": str(result),
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "EngineerHub API",
            "database_error": str(e),
        }
