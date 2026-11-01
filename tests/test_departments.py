"""Department, WorkType, and WorkStatus API tests."""


def test_department_crud(client, admin_headers):
    # 1. Create
    resp = client.post(
        "/api/v1/departments",
        headers=admin_headers,
        json={"name": "Civil Engineering", "description": "Civil structural"},
    )
    assert resp.status_code == 201
    dept_id = resp.json()["id"]

    # 2. Get
    get_resp = client.get(f"/api/v1/departments/{dept_id}", headers=admin_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Civil Engineering"

    # 3. Update
    up_resp = client.put(
        f"/api/v1/departments/{dept_id}",
        headers=admin_headers,
        json={"description": "Updated Civil"},
    )
    assert up_resp.status_code == 200
    assert up_resp.json()["description"] == "Updated Civil"

    # 4. Delete
    del_resp = client.delete(f"/api/v1/departments/{dept_id}", headers=admin_headers)
    assert del_resp.status_code == 200


def test_department_safe_deletion_prevented_when_in_use(client, admin_headers, test_seed_data):
    dept = test_seed_data["department"]
    # Attempt delete department with assigned engineers
    resp = client.delete(f"/api/v1/departments/{dept.id}", headers=admin_headers)
    assert resp.status_code == 400
    assert resp.json()["code"] == "DEPARTMENT_IN_USE"


def test_work_type_and_status_crud(client, admin_headers):
    # Work Type
    wt_resp = client.post(
        "/api/v1/work-types",
        headers=admin_headers,
        json={"name": "Testing & QA", "description": "QA work"},
    )
    assert wt_resp.status_code == 201
    wt_id = wt_resp.json()["id"]

    wt_del = client.delete(f"/api/v1/work-types/{wt_id}", headers=admin_headers)
    assert wt_del.status_code == 200

    # Work Status
    ws_resp = client.post(
        "/api/v1/work-statuses",
        headers=admin_headers,
        json={"name": "Under Review", "description": "Reviewing"},
    )
    assert ws_resp.status_code == 201
    ws_id = ws_resp.json()["id"]

    ws_del = client.delete(f"/api/v1/work-statuses/{ws_id}", headers=admin_headers)
    assert ws_del.status_code == 200
