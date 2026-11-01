# EngineerHub — Backend API

**EngineerHub** is an internal enterprise management platform built for **DME** to manage engineers, projects, departments, work types, work statuses, work logs, working calendars, and administrative analytics.

The backend is built with **FastAPI**, **SQLAlchemy 2.x**, **SQLite**, and **Pydantic v2**, tailored to be consumed by an **Electron desktop application running Next.js**.

---

## 1. Architecture

```text
                    EngineerHub
                         │
              ┌──────────┴──────────┐
              │                     │
        Electron App          Electron App
              │                     │
          Next.js               Next.js
              │                     │
              └──────────┬──────────┘
                         │ (HTTP / JSON REST API)
                      REST API
                         │
                    FastAPI
                         │
                    SQLAlchemy 2.x
                         │
                      SQLite (WAL Mode & Busy Timeout)
                         │
                Company Shared Folder (UNC Path / Local Storage)
```

> **Important Database Architecture**:
> - Clients (Electron / Next.js) **NEVER** connect directly to the SQLite database file.
> - The FastAPI REST API is the **only** component that reads and writes to the SQLite database.
> - Database path is configurable via `DATABASE_URL` and supports local paths (`sqlite:///./data/engineerhub.db`) as well as Windows UNC network share paths (e.g. `sqlite://///DME-SERVER/DME-SHARE/EngineerHub/engineerhub.db`).

---

## 2. Technology Stack

* **Language**: Python 3.12+ (tested on Python 3.14)
* **Framework**: FastAPI
* **ORM**: SQLAlchemy 2.0
* **Database**: SQLite with Write-Ahead Logging (`WAL`), `PRAGMA busy_timeout = 10000`, `PRAGMA foreign_keys = ON`, `PRAGMA synchronous = NORMAL`
* **Validation & Settings**: Pydantic v2 & Pydantic-Settings
* **Migrations**: Alembic
* **Authentication**: JWT Bearer Tokens (`pyjwt[crypto]`) & `bcrypt` password hashing
* **Server**: Uvicorn ASGI
* **Testing**: Pytest & HTTPX (`pytest-asyncio`)

---

## 3. Project Structure

```text
EngineerHub/
├── app/
│   ├── main.py                  # FastAPI application entry point, CORS, and error handlers
│   │
│   ├── core/
│   │   ├── config.py            # Pydantic Settings (.env configuration)
│   │   ├── database.py          # SQLite connection, WAL pragmas, SessionLocal
│   │   ├── security.py          # bcrypt password hashing & JWT token management
│   │   ├── dependencies.py      # Auth, RBAC, and DB session dependencies
│   │   └── exceptions.py        # Custom domain exception classes & error codes
│   │
│   ├── models/                  # SQLAlchemy 2.0 Declarative Models
│   │   ├── base.py              # Base model with created_at/updated_at TimestampMixin
│   │   ├── user.py              # User account & UserRole (ADMIN, ENGINEER)
│   │   ├── engineer.py          # Engineer profile (linked 1:1 to User)
│   │   ├── department.py        # Engineering departments
│   │   ├── project.py           # Projects
│   │   ├── work_type.py         # Work types (Site Work, Office Work, Design, etc.)
│   │   ├── work_status.py       # Work statuses (Completed, In Progress, etc.)
│   │   ├── work_log.py          # Daily work logs with composite indexes
│   │   └── audit_log.py         # Audit logging for security & compliance
│   │
│   ├── schemas/                 # Pydantic v2 Request & Response schemas
│   │   ├── common.py            # PaginatedResponse, MessageResponse, ErrorResponse
│   │   ├── auth.py              # LoginRequest, Token, ChangePasswordRequest
│   │   ├── user.py              # User schemas
│   │   ├── engineer.py          # Engineer schemas
│   │   ├── department.py        # Department schemas
│   │   ├── project.py           # Project schemas
│   │   ├── work_type.py         # WorkType schemas
│   │   ├── work_status.py       # WorkStatus schemas
│   │   ├── work_log.py          # WorkLog schemas
│   │   ├── analytics.py         # Overview, Engineer, Dept, & Project metrics
│   │   └── audit_log.py         # Audit log query schemas
│   │
│   ├── services/                # Business Logic Layer
│   │   ├── auth_service.py      # Authentication, login audits, password change
│   │   ├── calendar_service.py  # Friday/Saturday non-working day & hours limits
│   │   ├── engineer_service.py  # Engineer CRUD & transactional user creation
│   │   ├── department_service.py# Department CRUD & dependency validation
│   │   ├── project_service.py   # Project CRUD, activation, safe deletion
│   │   ├── work_type_service.py # WorkType CRUD
│   │   ├── work_status_service.py# WorkStatus CRUD
│   │   ├── work_log_service.py  # Work log rules, DB filtering, IDOR protection
│   │   ├── analytics_service.py # Aggregated metrics computed in SQL
│   │   └── audit_service.py     # Centralized audit logging
│   │
│   ├── api/
│   │   └── v1/                  # API Version 1 Routers
│   │       ├── router.py        # Master v1 Router
│   │       ├── health.py        # Health & database verification endpoints
│   │       ├── auth.py          # Auth endpoints (/login, /logout, /me, /change-password)
│   │       ├── engineers.py     # Engineer self-service endpoints
│   │       ├── departments.py   # Department endpoints
│   │       ├── projects.py      # Project endpoints
│   │       ├── work_types.py    # Work Type endpoints
│   │       ├── work_statuses.py # Work Status endpoints
│   │       ├── admin.py         # Admin engineers, work-logs filtering, audit logs
│   │       └── analytics.py     # Admin KPI & analytics endpoints
│   │
│   └── utils/
│       ├── logger.py            # Structured application logging
│       └── pagination.py        # Pagination helpers
│
├── cli/                         # Administrative CLI Tools
│   ├── seed.py                  # Seed reference metadata & initial admin
│   └── create_admin.py          # Interactive/CLI admin account creator
│
├── migrations/                  # Alembic database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│
├── tests/                       # Automated Pytest Suite (36 tests)
│   ├── conftest.py              # In-memory SQLite fixtures & clients
│   ├── test_health.py
│   ├── test_auth.py
│   ├── test_engineers.py
│   ├── test_departments.py
│   ├── test_projects.py
│   ├── test_work_logs.py        # Friday/Saturday validation & IDOR tests
│   ├── test_admin_filtering.py  # Multi-parameter DB query tests
│   ├── test_analytics.py        # SQL aggregation tests
│   └── test_audit_logs.py
│
├── .env                         # Local environment variables
├── .env.example                 # Configuration template
├── alembic.ini                  # Alembic configuration
├── requirements.txt             # Project dependencies
└── README.md
```

---

## 4. Business Rules & Safety Mechanisms

### 4.1 Non-Working Days (Fridays & Saturdays)
- **Rule**: By default, **Fridays** and **Saturdays** are non-working company days.
- **Enforcement**: Validated centrally inside `calendar_service.py`. If an engineer or administrator attempts to submit or update a work log on a Friday or Saturday, the API rejects the request with HTTP 400 and error code `NON_WORKING_DAY`.

### 4.2 Daily Work Hours Validation
- **Rule**: Hours must be greater than 0 and daily total logged hours cannot exceed `MAX_DAILY_WORK_HOURS` (default: 24.0, configurable via `.env`).
- **Precision**: Uses `Numeric(4, 2)` / `Decimal` to avoid floating-point inaccuracies.

### 4.3 Inactive Entity Safeguards
- Work logs cannot be recorded against deactivated projects, deactivated work types, deactivated work statuses, or for deactivated engineers.

### 4.4 Authorization & IDOR Protection
- Engineers can only query, create, update, or delete **their own** work logs.
- Attempting to access or modify another engineer's work log by ID returns HTTP 403 Forbidden.
- Administrators have complete platform access.

### 4.5 Safe Deletions & Referential Integrity
- Departments with assigned engineers cannot be deleted.
- Projects and Work Types with historical work logs cannot be deleted (deactivation is recommended to preserve history).

---

## 5. Installation & Setup

### 5.1 Prerequisites
- Python 3.12 or higher
- Git

### 5.2 Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository_url>
cd EngineerHub

# Install dependencies
pip install -r requirements.txt
```

### 5.3 Configure Environment Variables

Copy `.env.example` to `.env` and configure your settings:

```bash
cp .env.example .env
```

Key environment variables in `.env`:

```env
APP_NAME=EngineerHub
APP_ENV=development
DEBUG=True
API_V1_STR=/api/v1

# SQLite Database path
DATABASE_URL=sqlite:///./data/engineerhub.db

# JWT Security
JWT_SECRET_KEY=engineerhub-super-secret-jwt-token-key-change-in-production-2026
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480

# Business Rules
MAX_DAILY_WORK_HOURS=24.0
NON_WORKING_DAYS=4,5

# CORS (Electron / Next.js origins)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,app://-,file://

# Seed Admin Credentials
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_EMAIL=admin@dme.internal
INITIAL_ADMIN_PASSWORD=AdminSecurePassword123!
```

---

## 6. Database Migrations & Initial Data

### 6.1 Run Alembic Migrations

```bash
# Apply migrations to database
python -m alembic upgrade head
```

To create a new migration after model changes:

```bash
python -m alembic revision --autogenerate -m "Description of changes"
python -m alembic upgrade head
```

### 6.2 Seed Default Reference Data

Populate default departments (Electrical, Mechanical, Surveying, Civil, Architecture), work types (Site Work, Office Work, Design, Inspection, Meeting, Documentation), work statuses (Completed, In Progress, Pending, Reviewed), and the initial Administrator account:

```bash
# Seed default reference data
python -m cli.seed

# Or seed with realistic sample engineers, projects, and work logs for demo/testing:
python -m cli.seed --with-sample-data
```

### 6.3 Create Admin User via CLI

You can also interactively create an administrator:

```bash
python -m cli.create_admin
```

Or pass arguments directly:

```bash
python -m cli.create_admin --username superadmin --email superadmin@dme.internal --password SuperSecurePass123!
```

---

## 7. Running the Application

### 7.1 Start as Native Desktop Application (Electron)

You can run EngineerHub as a native desktop application in two easy ways:

#### Option A: One-Click Launcher
Double-click `launch_engineerhub.bat` in the root folder, or run:
```bash
python launch_app.py
```
This automatically starts both the FastAPI backend and the Electron desktop application window.

#### Option B: Manual Launch
1. In the first terminal (Root folder), start the backend:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. In the second terminal (`frontend` folder), start Electron Desktop:
   ```bash
   cd frontend
   npm run desktop
   ```

### 7.2 Start as Web Browser App (Optional)

If you wish to access it via web browser instead:
```bash
cd frontend
npm run dev
```
And navigate to `http://localhost:3000`.

---

## 8. Running Automated Tests

Run the complete automated test suite (36 tests covering authentication, RBAC, business rules, Friday/Saturday rejection, daily hours cap, admin multi-filtering, analytics, and audit logging):

```bash
python -m pytest -v
```

---

## 9. API Overview

All API routes start with `/api/v1` (except root `/health`).

### Authentication
* `POST /api/v1/auth/login` — Authenticate and receive JWT access token.
* `POST /api/v1/auth/logout` — Logout and record audit log.
* `GET  /api/v1/auth/me` — Get profile of currently logged-in user.
* `PUT  /api/v1/auth/change-password` — Self-service password change.

### Engineer Self-Service
* `GET    /api/v1/engineers/me` — Get own engineer profile.
* `PUT    /api/v1/engineers/me` — Update own profile details.
* `GET    /api/v1/engineers/me/work-logs` — Paginated list of own work logs with date/project/status filters.
* `POST   /api/v1/engineers/me/work-logs` — Create work log entry (with working day & hours validation).
* `GET    /api/v1/engineers/me/work-logs/{id}` — Get work log by ID (IDOR protected).
* `PUT    /api/v1/engineers/me/work-logs/{id}` — Update own work log.
* `DELETE /api/v1/engineers/me/work-logs/{id}` — Delete own work log.
* `GET    /api/v1/engineers/me/statistics` — Own summary: hours by project/type/status and daily/weekly/monthly breakdown.

### Departments
* `GET    /api/v1/departments` — List active departments (or all for admin).
* `POST   /api/v1/departments` — Create department (Admin).
* `GET    /api/v1/departments/{id}` — Get department by ID.
* `PUT    /api/v1/departments/{id}` — Update department (Admin).
* `DELETE /api/v1/departments/{id}` — Safe delete department (Admin).

### Projects
* `GET    /api/v1/projects` — List projects (active for engineers, all for admin).
* `POST   /api/v1/projects` — Create project (Admin).
* `GET    /api/v1/projects/{id}` — Get project by ID.
* `PUT    /api/v1/projects/{id}` — Update project (Admin).
* `PATCH  /api/v1/projects/{id}/activate` — Reactivate project (Admin).
* `PATCH  /api/v1/projects/{id}/deactivate` — Deactivate project (Admin).
* `DELETE /api/v1/projects/{id}` — Safe delete project (Admin).

### Work Types & Work Statuses
* `GET    /api/v1/work-types` & `POST /api/v1/work-types` — Manage work classifications.
* `GET    /api/v1/work-statuses` & `POST /api/v1/work-statuses` — Manage work progress states.

### Administration
* `GET    /api/v1/admin/engineers` — List engineers with search, department filtering, and pagination.
* `POST   /api/v1/admin/engineers` — Create User + Engineer transactionally.
* `GET    /api/v1/admin/engineers/{id}` — View engineer details.
* `PUT    /api/v1/admin/engineers/{id}` — Update engineer.
* `PATCH  /api/v1/admin/engineers/{id}/activate` — Activate engineer & login account.
* `PATCH  /api/v1/admin/engineers/{id}/deactivate` — Deactivate engineer & login account.
* `DELETE /api/v1/admin/engineers/{id}` — Safe delete engineer.
* `POST   /api/v1/admin/engineers/{id}/reset-password` — Admin resets engineer's password.
* `GET    /api/v1/admin/work-logs` — Multi-parameter database-level filtering (`engineer_id`, `department_id`, `project_id`, `work_type_id`, `status_id`, `date_from`, `date_to`, `min_hours`, `max_hours`, `engineer_is_active`).
* `POST   /api/v1/admin/work-logs` — Create work log on behalf of an engineer.
* `GET    /api/v1/admin/audit-logs` — Query audit logs.

### Analytics
* `GET /api/v1/admin/analytics/overview` — Platform KPIs: total engineers, projects, work logs, total hours, average hours per engineer and working day.
* `GET /api/v1/admin/analytics/engineers/{id}` — Deep dive engineer metrics: hours by project, type, status, and time series.
* `GET /api/v1/admin/analytics/departments` — Department distributions and total hours.
* `GET /api/v1/admin/analytics/projects` — Project hours, engineer counts, and trends over time.

---

## 10. Production Deployment & SQLite Shared-Folder Considerations

When hosting the SQLite database on a shared network drive (e.g. `\\DME-SERVER\DME-SHARE\EngineerHub\engineerhub.db`):

1. **Centralized FastAPI Service**:
   - Only the host running the FastAPI service mounts the network share and accesses the database file.
   - Electron client desktop apps across the company network send standard HTTP REST requests to the FastAPI backend.
2. **SQLite Pragmas for Concurrency**:
   - `PRAGMA journal_mode = WAL;` enables concurrent readers while a write transaction is occurring.
   - `PRAGMA busy_timeout = 10000;` ensures write transactions wait up to 10 seconds rather than failing immediately with a lock error.
   - `PRAGMA foreign_keys = ON;` guarantees relational integrity across all tables.
   - `PRAGMA synchronous = NORMAL;` delivers high write throughput while maintaining database consistency.
3. **Short Transactions**:
   - The service layer wraps database writes in short, discrete transactions, avoiding long-lived open locks.
"# EngineerHub" 
"# Engineer_Hub" 
