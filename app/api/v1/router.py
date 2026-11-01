"""API v1 Master Router."""

from fastapi import APIRouter
from app.api.v1.admin import router as admin_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.auth import router as auth_router
from app.api.v1.departments import router as departments_router
from app.api.v1.engineers import router as engineers_router
from app.api.v1.health import router as health_router
from app.api.v1.projects import router as projects_router
from app.api.v1.work_statuses import router as work_statuses_router
from app.api.v1.work_types import router as work_types_router

api_v1_router = APIRouter()

# Register sub-routers
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(engineers_router)
api_v1_router.include_router(departments_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(work_types_router)
api_v1_router.include_router(work_statuses_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(analytics_router)
