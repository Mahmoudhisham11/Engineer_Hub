"""Authentication and Authorization tests."""

from app.models.user import User


def test_login_success_admin(client, test_seed_data):
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin_test", "password": "AdminPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin_test"
    assert data["user"]["role"] == "ADMIN"


def test_login_success_engineer(client, test_seed_data):
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "eng1_test@dme.internal", "password": "EngineerPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ENGINEER"
    assert data["engineer"] is not None
    assert data["engineer"]["employee_code"] == "ENG-T1"


def test_login_invalid_password(client, test_seed_data):
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin_test", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "AUTHENTICATION_FAILED"


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "nonexistent_user", "password": "AnyPassword123!"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == "AUTHENTICATION_FAILED"


def test_login_inactive_user(client, db, test_seed_data):
    # Deactivate engineer user
    eng_user = test_seed_data["engineer1_user"]
    eng_user.is_active = False
    db.add(eng_user)
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "engineer1_test", "password": "EngineerPass123!"},
    )
    assert response.status_code == 403


def test_auth_me_endpoint(client, engineer1_headers):
    response = client.get("/api/v1/auth/me", headers=engineer1_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["username"] == "engineer1_test"
    assert data["engineer"]["full_name"] == "Engineer One Test"


def test_unauthorized_request_rejected(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_role_authorization_engineer_accessing_admin_rejected(client, engineer1_headers):
    response = client.get("/api/v1/admin/engineers", headers=engineer1_headers)
    assert response.status_code == 403
    data = response.json()
    assert data["code"] == "FORBIDDEN"


def test_change_password_self(client, engineer1_headers):
    response = client.put(
        "/api/v1/auth/change-password",
        headers=engineer1_headers,
        json={"current_password": "EngineerPass123!", "new_password": "NewEngineerPass123!"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Check login with new password
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "engineer1_test", "password": "NewEngineerPass123!"},
    )
    assert login_resp.status_code == 200


def test_logout(client, engineer1_headers):
    response = client.post("/api/v1/auth/logout", headers=engineer1_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
