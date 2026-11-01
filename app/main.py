"""EngineerHub FastAPI Application Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.exceptions import AppException
from app.utils.logger import logger

tags_metadata = [
    {"name": "Health", "description": "System health and connectivity verification."},
    {"name": "Authentication", "description": "User authentication, JWT token issuance, and password management."},
    {"name": "Engineers", "description": "Engineer self-service profile and work logs management."},
    {"name": "Projects", "description": "Company engineering project management."},
    {"name": "Departments", "description": "Company engineering departments."},
    {"name": "Work Types", "description": "Work category and activity classification."},
    {"name": "Work Statuses", "description": "Work progress and approval status management."},
    {"name": "Administration", "description": "Administrative management for engineers, all work logs, and audit logs."},
    {"name": "Analytics", "description": "Platform-wide, department, project, and individual engineer analytics and KPIs."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown event lifecycle handler."""
    logger.info(f"Starting {settings.APP_NAME} in '{settings.APP_ENV}' mode...")
    logger.info(f"Database URL configured: {settings.DATABASE_URL}")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Internal Enterprise API for DME EngineerHub (Engineers, Projects, Work Logs & Analytics)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi.encoders import jsonable_encoder


# Exception Handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Handle custom application and business rule exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder({
            "success": False,
            "message": exc.message,
            "code": exc.code,
            "details": exc.details,
        }),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic request validation errors."""
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = [str(x) for x in err.get("loc", []) if x != "body"]
        field = ".".join(loc) if loc else "field"
        msg = err.get("msg", "Invalid value")
        messages.append(f"{field}: {msg}")
    
    summary_message = ", ".join(messages) if messages else "Request validation failed."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder({
            "success": False,
            "message": summary_message,
            "code": "VALIDATION_ERROR",
            "details": errors,
        }),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected server errors without leaking internals."""
    logger.error(f"Unhandled Server Error at {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred. Please try again later.",
            "code": "INTERNAL_SERVER_ERROR",
            "details": None,
        },
    )


# Root health endpoint
@app.get("/health", tags=["Health"], summary="Basic health check")
def root_health_check():
    """Return API operational status."""
    return {
        "status": "ok",
        "service": "EngineerHub API",
    }


# Mount API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
