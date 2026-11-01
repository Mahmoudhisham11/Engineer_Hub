"""Project API tests."""


def test_project_crud(client, admin_headers):
    # 1. Create
    resp = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={
            "name": "Solar Power Station",
            "project_code": "PRJ-SOLAR-01",
            "description": "50MW solar farm",
        },
    )
    assert resp.status_code == 201
    proj_id = resp.json()["id"]

    # 2. Duplicate code rejected
    dup_resp = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={
            "name": "Another Solar",
            "project_code": "PRJ-SOLAR-01",
        },
    )
    assert dup_resp.status_code == 409

    # 3. Deactivate & Reactivate
    deact_resp = client.patch(f"/api/v1/projects/{proj_id}/deactivate", headers=admin_headers)
    assert deact_resp.status_code == 200
    assert deact_resp.json()["is_active"] is False

    act_resp = client.patch(f"/api/v1/projects/{proj_id}/activate", headers=admin_headers)
    assert act_resp.status_code == 200
    assert act_resp.json()["is_active"] is True

    # 4. Delete
    del_resp = client.delete(f"/api/v1/projects/{proj_id}", headers=admin_headers)
    assert del_resp.status_code == 200
