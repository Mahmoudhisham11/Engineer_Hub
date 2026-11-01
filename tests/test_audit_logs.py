"""Audit logging tests."""


def test_audit_logs_recorded_and_queryable(client, admin_headers, engineer1_headers):
    # Trigger an action that creates an audit log (e.g. login)
    client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin_test", "password": "AdminPass123!"},
    )

    # Query audit logs as admin
    response = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1

    actions = [item["action"] for item in data["items"]]
    assert "LOGIN_SUCCESS" in actions
