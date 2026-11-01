"""Database seeding script for initial metadata and default administrator."""

import argparse
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import select
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.department import Department
from app.models.engineer import Engineer
from app.models.project import Project
from app.models.user import User, UserRole
from app.models.work_log import WorkLog
from app.models.work_status import WorkStatus
from app.models.work_type import WorkType
from app.services.calendar_service import calendar_service

DEFAULT_DEPARTMENTS = [
    {"name": "Electrical", "description": "Electrical engineering, power distribution, and instrumentation."},
    {"name": "Mechanical", "description": "HVAC, plumbing, piping, and mechanical equipment systems."},
    {"name": "Surveying", "description": "Geodetic surveying, GIS mapping, and site boundary assessment."},
    {"name": "Civil", "description": "Structural analysis, geotechnical works, and foundation engineering."},
    {"name": "Architecture", "description": "Architectural design, interior layout, and urban planning."},
]

DEFAULT_WORK_TYPES = [
    {"name": "Site Work", "description": "On-site supervision, construction inspection, and physical field testing."},
    {"name": "Office Work", "description": "Administrative work, technical report drafting, and calculations."},
    {"name": "Design", "description": "CAD drafting, 3D modeling, calculations, and specification design."},
    {"name": "Inspection", "description": "Quality control, site compliance audits, and safety inspection."},
    {"name": "Meeting", "description": "Client coordination meetings, technical reviews, and team workshops."},
    {"name": "Documentation", "description": "Document approval processing, archiving, and submittals."},
]

DEFAULT_WORK_STATUSES = [
    {"name": "Completed", "description": "Work entry has been finished and verified."},
    {"name": "In Progress", "description": "Work entry is currently active and ongoing."},
    {"name": "Pending", "description": "Work entry awaiting review or materials."},
    {"name": "Reviewed", "description": "Work entry checked and approved by lead engineer/manager."},
]


def seed_database(with_sample_data: bool = False) -> None:
    """Seed base reference data and initial admin."""
    db = SessionLocal()
    try:
        print("Seeding default reference data...")

        # 1. Departments
        for dept_data in DEFAULT_DEPARTMENTS:
            existing = db.execute(
                select(Department).where(Department.name == dept_data["name"])
            ).scalar_one_or_none()
            if not existing:
                db.add(Department(**dept_data, is_active=True))
                print(f"  + Department: {dept_data['name']}")

        # 2. Work Types
        for type_data in DEFAULT_WORK_TYPES:
            existing = db.execute(
                select(WorkType).where(WorkType.name == type_data["name"])
            ).scalar_one_or_none()
            if not existing:
                db.add(WorkType(**type_data, is_active=True))
                print(f"  + Work Type: {type_data['name']}")

        # 3. Work Statuses
        for status_data in DEFAULT_WORK_STATUSES:
            existing = db.execute(
                select(WorkStatus).where(WorkStatus.name == status_data["name"])
            ).scalar_one_or_none()
            if not existing:
                db.add(WorkStatus(**status_data, is_active=True))
                print(f"  + Work Status: {status_data['name']}")

        db.commit()

        # 4. Initial Admin Account
        admin_user = db.execute(
            select(User).where(User.username == settings.INITIAL_ADMIN_USERNAME)
        ).scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                username=settings.INITIAL_ADMIN_USERNAME,
                email=settings.INITIAL_ADMIN_EMAIL,
                password_hash=hash_password(settings.INITIAL_ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            print(f"  + Admin User created: '{settings.INITIAL_ADMIN_USERNAME}' ({settings.INITIAL_ADMIN_EMAIL})")
        else:
            print(f"  * Admin User '{settings.INITIAL_ADMIN_USERNAME}' already exists.")

        # 5. Optional Sample Data (Projects, Engineers, Work Logs)
        if with_sample_data:
            print("\nSeeding sample projects, engineers, and work logs...")

            # Sample Projects
            projects_data = [
                {"name": "Metro Line 4 Extension", "project_code": "PRJ-METRO-04", "description": "Underground tunneling and civil works."},
                {"name": "Substation 220kV Grid", "project_code": "PRJ-SUBSTATION-220", "description": "High-voltage transmission and switchgear."},
                {"name": "Al-Amal Commercial Tower", "project_code": "PRJ-TOWER-01", "description": "High-rise architectural and MEP installation."},
            ]
            projects = []
            for p_data in projects_data:
                p = db.execute(select(Project).where(Project.project_code == p_data["project_code"])).scalar_one_or_none()
                if not p:
                    p = Project(**p_data, is_active=True)
                    db.add(p)
                    db.flush()
                projects.append(p)

            # Sample Engineers
            elec_dept = db.execute(select(Department).where(Department.name == "Electrical")).scalar_one()
            civil_dept = db.execute(select(Department).where(Department.name == "Civil")).scalar_one()

            sample_engineers_data = [
                {
                    "username": "ahmed.m",
                    "email": "ahmed.m@dme.internal",
                    "password": "EngineerPassword123!",
                    "full_name": "Ahmed Mohamed",
                    "employee_code": "ENG-101",
                    "department_id": elec_dept.id,
                },
                {
                    "username": "sara.h",
                    "email": "sara.h@dme.internal",
                    "password": "EngineerPassword123!",
                    "full_name": "Sara Hassan",
                    "employee_code": "ENG-102",
                    "department_id": civil_dept.id,
                },
            ]

            engineers = []
            for eng_data in sample_engineers_data:
                u = db.execute(select(User).where(User.username == eng_data["username"])).scalar_one_or_none()
                if not u:
                    u = User(
                        username=eng_data["username"],
                        email=eng_data["email"],
                        password_hash=hash_password(eng_data["password"]),
                        role=UserRole.ENGINEER,
                        is_active=True,
                    )
                    db.add(u)
                    db.flush()

                    eng = Engineer(
                        user_id=u.id,
                        employee_code=eng_data["employee_code"],
                        full_name=eng_data["full_name"],
                        department_id=eng_data["department_id"],
                        is_active=True,
                    )
                    db.add(eng)
                    db.flush()
                    engineers.append(eng)
                else:
                    eng = db.execute(select(Engineer).where(Engineer.user_id == u.id)).scalar_one()
                    engineers.append(eng)

            # Sample Work Logs for past 10 days (skipping Fridays and Saturdays)
            types = db.execute(select(WorkType)).scalars().all()
            statuses = db.execute(select(WorkStatus)).scalars().all()

            today = date.today()
            logs_created = 0
            for eng in engineers:
                for day_offset in range(1, 15):
                    target_date = today - timedelta(days=day_offset)
                    if calendar_service.is_working_day(target_date):
                        # check if log already exists
                        existing_log = db.execute(
                            select(WorkLog).where(
                                WorkLog.engineer_id == eng.id,
                                WorkLog.work_date == target_date,
                            )
                        ).scalar_one_or_none()
                        if not existing_log:
                            db.add(
                                WorkLog(
                                    engineer_id=eng.id,
                                    work_date=target_date,
                                    project_id=projects[logs_created % len(projects)].id,
                                    hours=Decimal("8.00"),
                                    work_type_id=types[logs_created % len(types)].id,
                                    work_status_id=statuses[logs_created % len(statuses)].id,
                                    notes=f"Completed daily tasks for {target_date.strftime('%A')}.",
                                )
                            )
                            logs_created += 1

            db.commit()
            print(f"  + Sample projects: {len(projects)}, Sample engineers: {len(engineers)}, Sample work logs: {logs_created}")

        print("\n[OK] Seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error while seeding: {e}")
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Seed EngineerHub database.")
    parser.add_argument("--with-sample-data", action="store_true", help="Include sample projects, engineers, and work logs")
    args = parser.parse_args()
    seed_database(with_sample_data=args.with_sample_data)


if __name__ == "__main__":
    main()
