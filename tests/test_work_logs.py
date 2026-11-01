"""Work Logs and Business Rules (Friday/Saturday non-working days, max daily hours, IDOR) tests."""

from datetime import date, timedelta
from decimal import Decimal
import pytest


def get_next_weekday(target_weekday: int) -> date:
    """Find the next upcoming calendar date matching target_weekday (0=Mon, 4=Fri, 5=Sat, 6=Sun)."""
    today = date.today()
    days_ahead = target_weekday - today.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    return today + timedelta(days=days_ahead)


def test_create_work_log_success_on_working_day(client, engineer1_headers, test_seed_data):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]

    # Pick next Monday (0=Mon, guaranteed working day)
    working_date = get_next_weekday(0)

    payload = {
        "work_date": working_date.isoformat(),
        "project_id": proj.id,
        "hours": "7.50",
        "work_type_id": wtype.id,
        "work_status_id": wstatus.id,
        "notes": "Completed engineering design review",
    }
    response = client.post("/api/v1/engineers/me/work-logs", headers=engineer1_headers, json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["work_date"] == working_date.isoformat()
    assert float(data["hours"]) == 7.50
    assert data["project"]["name"] == "Metro Expansion"
    assert data["work_type"]["name"] == "Site Work Test"


def test_work_log_rejected_on_friday(client, engineer1_headers, test_seed_data):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]

    # Friday = 4
    friday_date = get_next_weekday(4)

    payload = {
        "work_date": friday_date.isoformat(),
        "project_id": proj.id,
        "hours": "8.00",
        "work_type_id": wtype.id,
        "work_status_id": wstatus.id,
        "notes": "Attempting Friday work log",
    }
    response = client.post("/api/v1/engineers/me/work-logs", headers=engineer1_headers, json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "NON_WORKING_DAY"
    assert "Friday" in data["message"]


def test_work_log_rejected_on_saturday(client, engineer1_headers, test_seed_data):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]

    # Saturday = 5
    saturday_date = get_next_weekday(5)

    payload = {
        "work_date": saturday_date.isoformat(),
        "project_id": proj.id,
        "hours": "8.00",
        "work_type_id": wtype.id,
        "work_status_id": wstatus.id,
        "notes": "Attempting Saturday work log",
    }
    response = client.post("/api/v1/engineers/me/work-logs", headers=engineer1_headers, json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "NON_WORKING_DAY"
    assert "Saturday" in data["message"]


def test_work_log_invalid_hours_zero_or_negative(client, engineer1_headers, test_seed_data):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]
    working_date = get_next_weekday(0)

    # 0 hours
    resp_zero = client.post(
        "/api/v1/engineers/me/work-logs",
        headers=engineer1_headers,
        json={
            "work_date": working_date.isoformat(),
            "project_id": proj.id,
            "hours": "0.00",
            "work_type_id": wtype.id,
            "work_status_id": wstatus.id,
        },
    )
    assert resp_zero.status_code == 422


def test_work_log_max_daily_hours_exceeded(client, engineer1_headers, test_seed_data):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]
    working_date = get_next_weekday(1)  # Tuesday

    # 1. Log 16 hours
    resp1 = client.post(
        "/api/v1/engineers/me/work-logs",
        headers=engineer1_headers,
        json={
            "work_date": working_date.isoformat(),
            "project_id": proj.id,
            "hours": "16.00",
            "work_type_id": wtype.id,
            "work_status_id": wstatus.id,
        },
    )
    assert resp1.status_code == 201

    # 2. Attempt to log another 10 hours on same day (total 26 > 24)
    resp2 = client.post(
        "/api/v1/engineers/me/work-logs",
        headers=engineer1_headers,
        json={
            "work_date": working_date.isoformat(),
            "project_id": proj.id,
            "hours": "10.00",
            "work_type_id": wtype.id,
            "work_status_id": wstatus.id,
        },
    )
    assert resp2.status_code == 400
    assert resp2.json()["code"] == "MAX_HOURS_EXCEEDED"


def test_work_log_rejected_for_inactive_project(client, engineer1_headers, admin_headers, test_seed_data):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]
    working_date = get_next_weekday(2)  # Wednesday

    # Deactivate project
    client.patch(f"/api/v1/projects/{proj.id}/deactivate", headers=admin_headers)

    # Attempt to log hours
    resp = client.post(
        "/api/v1/engineers/me/work-logs",
        headers=engineer1_headers,
        json={
            "work_date": working_date.isoformat(),
            "project_id": proj.id,
            "hours": "8.00",
            "work_type_id": wtype.id,
            "work_status_id": wstatus.id,
        },
    )
    assert resp.status_code == 400
    assert "inactive project" in resp.json()["message"]


def test_idor_protection_engineer_cannot_access_or_modify_other_engineer_log(
    client, engineer1_headers, engineer2_headers, test_seed_data
):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]
    working_date = get_next_weekday(3)  # Thursday

    # 1. Engineer 1 creates a log
    create_resp = client.post(
        "/api/v1/engineers/me/work-logs",
        headers=engineer1_headers,
        json={
            "work_date": working_date.isoformat(),
            "project_id": proj.id,
            "hours": "6.00",
            "work_type_id": wtype.id,
            "work_status_id": wstatus.id,
        },
    )
    assert create_resp.status_code == 201
    log_id = create_resp.json()["id"]

    # 2. Engineer 2 tries to GET Engineer 1's log -> 403 Forbidden
    get_resp = client.get(f"/api/v1/engineers/me/work-logs/{log_id}", headers=engineer2_headers)
    assert get_resp.status_code == 403

    # 3. Engineer 2 tries to PUT Engineer 1's log -> 403 Forbidden
    put_resp = client.put(
        f"/api/v1/engineers/me/work-logs/{log_id}",
        headers=engineer2_headers,
        json={"hours": "8.00"},
    )
    assert put_resp.status_code == 403

    # 4. Engineer 2 tries to DELETE Engineer 1's log -> 403 Forbidden
    del_resp = client.delete(f"/api/v1/engineers/me/work-logs/{log_id}", headers=engineer2_headers)
    assert del_resp.status_code == 403

    # 5. Engineer 1 can update and delete their own log
    owner_put = client.put(
        f"/api/v1/engineers/me/work-logs/{log_id}",
        headers=engineer1_headers,
        json={"notes": "Updated note by owner"},
    )
    assert owner_put.status_code == 200
    assert owner_put.json()["notes"] == "Updated note by owner"

    owner_del = client.delete(f"/api/v1/engineers/me/work-logs/{log_id}", headers=engineer1_headers)
    assert owner_del.status_code == 200
