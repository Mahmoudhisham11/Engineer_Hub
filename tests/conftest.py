"""Pytest fixtures and test database setup."""

import os
import pytest
from datetime import date, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.department import Department
from app.models.engineer import Engineer
from app.models.project import Project
from app.models.user import User, UserRole
from app.models.work_log import WorkLog
from app.models.work_status import WorkStatus
from app.models.work_type import WorkType

# In-memory SQLite engine for tests
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create test tables once for the test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    """Yield a database session per test and roll back changes."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    """Yield FastAPI TestClient overriding get_db dependency."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_seed_data(db):
    """Seed baseline department, project, work type, status, admin, and engineer."""
    # Department
    dept = Department(name="Electrical Test", description="Electrical Dept", is_active=True)
    db.add(dept)
    db.flush()

    # Work Type
    wtype = WorkType(name="Site Work Test", description="Site work", is_active=True)
    db.add(wtype)
    db.flush()

    # Work Status
    wstatus = WorkStatus(name="Completed Test", description="Completed", is_active=True)
    db.add(wstatus)
    db.flush()

    # Project
    proj = Project(name="Metro Expansion", project_code="PRJ-TEST-01", description="Metro project", is_active=True)
    db.add(proj)
    db.flush()

    # Admin User
    admin_user = User(
        username="admin_test",
        email="admin_test@dme.internal",
        password_hash=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin_user)
    db.flush()

    # Engineer 1 User & Profile
    eng1_user = User(
        username="engineer1_test",
        email="eng1_test@dme.internal",
        password_hash=hash_password("EngineerPass123!"),
        role=UserRole.ENGINEER,
        is_active=True,
    )
    db.add(eng1_user)
    db.flush()

    eng1 = Engineer(
        user_id=eng1_user.id,
        employee_code="ENG-T1",
        full_name="Engineer One Test",
        department_id=dept.id,
        is_active=True,
    )
    db.add(eng1)
    db.flush()

    # Engineer 2 User & Profile (for IDOR tests)
    eng2_user = User(
        username="engineer2_test",
        email="eng2_test@dme.internal",
        password_hash=hash_password("EngineerPass123!"),
        role=UserRole.ENGINEER,
        is_active=True,
    )
    db.add(eng2_user)
    db.flush()

    eng2 = Engineer(
        user_id=eng2_user.id,
        employee_code="ENG-T2",
        full_name="Engineer Two Test",
        department_id=dept.id,
        is_active=True,
    )
    db.add(eng2)
    db.commit()

    return {
        "department": dept,
        "work_type": wtype,
        "work_status": wstatus,
        "project": proj,
        "admin_user": admin_user,
        "engineer1_user": eng1_user,
        "engineer1": eng1,
        "engineer2_user": eng2_user,
        "engineer2": eng2,
    }


@pytest.fixture
def admin_headers(test_seed_data):
    """Bearer auth header for admin user."""
    admin_user = test_seed_data["admin_user"]
    token = create_access_token(subject=admin_user.id, role="ADMIN")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def engineer1_headers(test_seed_data):
    """Bearer auth header for engineer 1."""
    eng_user = test_seed_data["engineer1_user"]
    token = create_access_token(subject=eng_user.id, role="ENGINEER")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def engineer2_headers(test_seed_data):
    """Bearer auth header for engineer 2."""
    eng_user = test_seed_data["engineer2_user"]
    token = create_access_token(subject=eng_user.id, role="ENGINEER")
    return {"Authorization": f"Bearer {token}"}
