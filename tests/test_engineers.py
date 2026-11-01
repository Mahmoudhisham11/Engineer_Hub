"""Engineer Management API tests."""


def test_create_engineer_success(client, admin_headers, test_seed_data):
    dept = test_seed_data["department"]
    payload = {
        "username": "kareem.a",
        "email": "kareem.a@dme.internal",
        "password": "Password123!",
        "employee_code": "ENG-201",
        "full_name": "Kareem Adel",
        "department_id": dept.id,
        "is_active": True,
    }
    response = client.post("/api/v1/admin/engineers", headers=admin_headers, json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["employee_code"] == "ENG-201"
    assert data["full_name"] == "Kareem Adel"
    assert data["department"]["id"] == dept.id
    assert data["user"]["username"] == "kareem.a"


def test_create_engineer_duplicate_conflicts(client, admin_headers, test_seed_data):
    dept = test_seed_data["department"]
    # Duplicate username
    resp1 = client.post(
        "/api/v1/admin/engineers",
        headers=admin_headers,
        json={
            "username": "engineer1_test",
            "email": "unique1@dme.internal",
            "password": "Password123!",
            "employee_code": "ENG-UNIQ1",
            "full_name": "Unique Name",
            "department_id": dept.id,
        },
    )
    assert resp1.status_code == 409

    # Duplicate email
    resp2 = client.post(
        "/api/v1/admin/engineers",
        headers=admin_headers,
        json={
            "username": "unique_username_2",
            "email": "eng1_test@dme.internal",
            "password": "Password123!",
            "employee_code": "ENG-UNIQ2",
            "full_name": "Unique Name",
            "department_id": dept.id,
        },
    )
    assert resp2.status_code == 409

    # Duplicate employee_code
    resp3 = client.post(
        "/api/v1/admin/engineers",
        headers=admin_headers,
        json={
            "username": "unique_username_3",
            "email": "unique3@dme.internal",
            "password": "Password123!",
            "employee_code": "ENG-T1",
            "full_name": "Unique Name",
            "department_id": dept.id,
        },
    )
    assert resp3.status_code == 409


def test_list_engineers_admin_filtering(client, admin_headers, test_seed_data):
    response = client.get("/api/v1/admin/engineers?search=Engineer One", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert data["items"][0]["employee_code"] == "ENG-T1"


def test_update_engineer_admin(client, admin_headers, test_seed_data):
    eng = test_seed_data["engineer1"]
    response = client.put(
        f"/api/v1/admin/engineers/{eng.id}",
        headers=admin_headers,
        json={"full_name": "Engineer One Updated"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Engineer One Updated"


def test_deactivate_and_activate_engineer(client, admin_headers, test_seed_data):
    eng = test_seed_data["engineer2"]
    # Deactivate
    deact_resp = client.patch(f"/api/v1/admin/engineers/{eng.id}/deactivate", headers=admin_headers)
    assert deact_resp.status_code == 200
    assert deact_resp.json()["is_active"] is False

    # Attempt login while deactivated -> should fail
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "engineer2_test", "password": "EngineerPass123!"},
    )
    assert login_resp.status_code == 403

    # Reactivate
    act_resp = client.patch(f"/api/v1/admin/engineers/{eng.id}/activate", headers=admin_headers)
    assert act_resp.status_code == 200
    assert act_resp.json()["is_active"] is True


def test_admin_reset_engineer_password(client, admin_headers, test_seed_data):
    eng = test_seed_data["engineer1"]
    resp = client.post(
        f"/api/v1/admin/engineers/{eng.id}/reset-password",
        headers=admin_headers,
        json={"new_password": "NewResetPassword123!"},
    )
    assert resp.status_code == 200

    # Verify login with new password
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "engineer1_test", "password": "NewResetPassword123!"},
    )
    assert login_resp.status_code == 200


def test_engineer_self_profile_and_update(client, engineer1_headers):
    # Get own profile
    get_resp = client.get("/api/v1/engineers/me", headers=engineer1_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["employee_code"] == "ENG-T1"

    # Update own profile
    put_resp = client.put(
        "/api/v1/engineers/me",
        headers=engineer1_headers,
        json={"full_name": "Engineer One Self-Updated"},
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["full_name"] == "Engineer One Self-Updated"


def test_change_engineer_role(client, admin_headers, test_seed_data):
    eng = test_seed_data["engineer1"]
    # Promote to ADMIN
    resp = client.patch(
        f"/api/v1/admin/engineers/{eng.id}/role",
        headers=admin_headers,
        json={"role": "ADMIN"},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "ADMIN"

    # Demote back to ENGINEER
    resp2 = client.patch(
        f"/api/v1/admin/engineers/{eng.id}/role",
        headers=admin_headers,
        json={"role": "ENGINEER"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["user"]["role"] == "ENGINEER"

