"""Admin work logs rich filtering and pagination tests."""

from datetime import date, timedelta
from decimal import Decimal


def test_admin_work_logs_filtering_and_pagination(client, admin_headers, engineer1_headers, test_seed_data):
    proj = test_seed_data["project"]
    wtype = test_seed_data["work_type"]
    wstatus = test_seed_data["work_status"]
    eng1 = test_seed_data["engineer1"]

    today = date.today()
    # Create 3 logs on non-Fridays/Saturdays
    valid_dates = []
    curr = today
    while len(valid_dates) < 3:
        if curr.weekday() not in (4, 5):
            valid_dates.append(curr)
        curr -= timedelta(days=1)

    for i, v_date in enumerate(valid_dates):
        client.post(
            "/api/v1/engineers/me/work-logs",
            headers=engineer1_headers,
            json={
                "work_date": v_date.isoformat(),
                "project_id": proj.id,
                "hours": f"{5 + i}.00",
                "work_type_id": wtype.id,
                "work_status_id": wstatus.id,
            },
        )

    # 1. Filter by engineer_id
    resp = client.get(f"/api/v1/admin/work-logs?engineer_id={eng1.id}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 3
    assert len(data["items"]) >= 3

    # 2. Filter by project_id
    resp_proj = client.get(f"/api/v1/admin/work-logs?project_id={proj.id}", headers=admin_headers)
    assert resp_proj.status_code == 200
    assert resp_proj.json()["total"] >= 3

    # 3. Filter by min_hours and max_hours
    resp_hrs = client.get("/api/v1/admin/work-logs?min_hours=6.00&max_hours=7.00", headers=admin_headers)
    assert resp_hrs.status_code == 200
    for item in resp_hrs.json()["items"]:
        assert float(item["hours"]) >= 6.00
        assert float(item["hours"]) <= 7.00

    # 4. Pagination verification
    resp_page = client.get("/api/v1/admin/work-logs?page=1&page_size=2", headers=admin_headers)
    assert resp_page.status_code == 200
    page_data = resp_page.json()
    assert len(page_data["items"]) == 2
    assert page_data["page"] == 1
    assert page_data["page_size"] == 2
    assert page_data["total_pages"] >= 2
