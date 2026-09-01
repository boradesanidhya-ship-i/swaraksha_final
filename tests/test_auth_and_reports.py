"""
End-to-End Verification Test for PostgreSQL User Auth, Audit Logs, and Email Reports
"""

import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from api.main import app, db

def run_tests():
    print("==================================================")
    print("Testing SWARAKSHA Auth, Database & Email Pipeline")
    print("==================================================")

    client = TestClient(app)

    # 1. Health check
    res = client.get("/")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[1/6] Health Check:", res.json())

    # 2. Register New User
    test_email = f"agent_test_{os.getpid()}@swaraksha.ai"
    reg_payload = {
        "email": test_email,
        "password": "SecurePassword123!",
        "full_name": "Antigravity Test Agent"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    auth_data = res.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    print(f"[2/6] User Registration: Success! User ID: {user_id}, Email: {test_email}")

    # 3. User Login
    login_payload = {
        "email": test_email,
        "password": "SecurePassword123!"
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Login failed: {res.text}"
    login_token = res.json()["access_token"]
    print("[3/6] User Login: Success! Bearer token acquired.")

    # 4. Get Current User Profile
    headers = {"Authorization": f"Bearer {login_token}"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200, f"Get Profile failed: {res.text}"
    profile = res.json()
    assert profile["email"] == test_email
    print(f"[4/6] Profile Retrieval: Success! Name: {profile['full_name']}")

    # 5. Create and Retrieve Reports
    rep = db.create_scan_report(
        report_type="FACE_SCAN",
        action_verdict="BLOCK",
        summary="High-confidence synthetic manipulation detected on protected identity.",
        details={"faces_detected": 1, "identity": {"protected_identity_detected": True}},
        user_id=user_id,
        user_email=test_email,
        email_sent=False
    )
    print(f"[5/6] Scan Report Created: ID #{rep['id']}")

    res = client.get("/api/reports", headers=headers)
    assert res.status_code == 200, f"List reports failed: {res.text}"
    user_reports = res.json()
    assert len(user_reports) >= 1
    print(f"[5/6] Scan Reports Retrieved from Database: {len(user_reports)} report(s) found.")

    # 6. Test Email Resend
    res = client.post(f"/api/reports/{rep['id']}/resend-email", headers=headers)
    assert res.status_code == 200, f"Resend email failed: {res.text}"
    print(f"[6/6] Email Dispatch: {res.json()['message']}")

    # Check Audit Logs
    logs = db.get_audit_logs(user_id=user_id)
    print(f"Audit Logs for user: {len(logs)} log entries recorded.")
    for l in logs:
        print(f"  - [{l['timestamp']}] {l['action']}: {l['details']}")

    print("==================================================")
    print("All PostgreSQL Auth, Reports & Email Tests Passed!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
