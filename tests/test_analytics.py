"""Admin Analytics endpoints tests."""

from datetime import date, timedelta


def test_admin_analytics_overview(client, admin_headers, engineer1_headers, test_seed_data):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]

    # Log 8 hours
    valid_date = date.today()
    while valid_date.weekday() in (4, 5):
        valid_date -= timedelta(days=1)

    client.post(
        "/api/v1/engineers/me/work-logs",
        headers=engineer1_headers,
        json={
            "work_date": valid_date.isoformat(),
            "project_id": proj.id,
            "hours": "8.00",
            "work_type_id": wtype.id,
            "work_status_id": wstatus.id,
        },
    )

    response = client.get("/api/v1/admin/analytics/overview", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_engineers"] >= 2
    assert data["active_engineers"] >= 2
    assert data["total_projects"] >= 1
    assert data["total_work_logs"] >= 1
    assert float(data["total_hours"]) >= 8.00


def test_admin_analytics_engineer_deep_dive(client, admin_headers, engineer1_headers, test_seed_data):
    eng1 = test_seed_data["engineer1"]
    response = client.get(f"/api/v1/admin/analytics/engineers/{eng1.id}", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["engineer_id"] == eng1.id
    assert data["employee_code"] == "ENG-T1"
    assert "hours_by_project" in data
    assert "hours_by_work_type" in data
    assert "hours_by_status" in data
    assert "daily_hours" in data
    assert "weekly_hours" in data
    assert "monthly_hours" in data


def test_admin_analytics_departments(client, admin_headers, test_seed_data):
    response = client.get("/api/v1/admin/analytics/departments", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["departments"]) >= 1
    assert data["departments"][0]["total_engineers"] >= 1


def test_admin_analytics_projects(client, admin_headers, test_seed_data):
    response = client.get("/api/v1/admin/analytics/projects", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["projects"]) >= 1
    assert data["projects"][0]["project_code"] == "PRJ-TEST-01"


def test_admin_analytics_matrix(client, admin_headers, engineer1_headers, test_seed_data):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]
    eng1 = test_seed_data["engineer1"]

    # Log hours on valid working day
    valid_date = date(2026, 9, 2)  # Wednesday
    client.post(
        "/api/v1/engineers/me/work-logs",
        headers=engineer1_headers,
        json={
            "work_date": valid_date.isoformat(),
            "project_id": proj.id,
            "hours": "8.00",
            "work_type_id": wtype.id,
            "work_status_id": wstatus.id,
        },
    )

    # Test month query
    response = client.get("/api/v1/admin/analytics/matrix?month=2026-09", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()

    # Verify period summary & working days
    assert "period_summary" in data
    period = data["period_summary"]
    assert period["total_calendar_days"] == 30
    # September 2026 has 4 Fridays and 4 Saturdays = 8 weekend days, 22 working days
    assert period["working_days_count"] == 22
    assert period["weekend_days_count"] == 8
    assert float(period["expected_hours_per_engineer"]) == 176.0

    # Verify projects and rows
    assert len(data["projects"]) >= 1
    assert len(data["rows"]) >= 1

    # Find eng1 row
    eng_row = next((r for r in data["rows"] if r["engineer_id"] == eng1.id), None)
    assert eng_row is not None
    assert float(eng_row["total_hours"]) >= 8.0
    assert str(proj.id) in eng_row["allocations"] or proj.id in eng_row["allocations"]

    alloc = eng_row["allocations"].get(str(proj.id)) or eng_row["allocations"].get(proj.id)
    assert alloc is not None
    assert float(alloc["hours"]) >= 8.0
    assert alloc["percentage_of_logged"] > 0


def test_admin_analytics_matrix_export_excel(client, admin_headers, test_seed_data):
    response = client.get("/api/v1/admin/analytics/matrix/export?month=2026-09", headers=admin_headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "attachment" in response.headers["content-disposition"]
    assert len(response.content) > 1000  # valid binary xlsx file
