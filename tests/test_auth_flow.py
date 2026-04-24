import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.db import models


def _cleanup_user_by_email(email: str) -> None:
    db = SessionLocal()
    try:
        db.query(models.User).filter(models.User.email == email).delete()
        db.commit()
    finally:
        db.close()


def test_register_login_and_me_roundtrip() -> None:
    client = TestClient(app)

    unique = uuid.uuid4().hex[:10]
    username = f"test_user_{unique}"
    email = f"{unique}@example.com"
    password = "pass1234"

    try:
        register_resp = client.post(
            "/auth/register",
            json={"username": username, "email": email, "password": password},
        )
        assert register_resp.status_code == 200, register_resp.text
        register_body = register_resp.json()
        assert register_body["username"] == username
        assert register_body["email"] == email

        token_resp = client.post(
            "/auth/token",
            data={"username": username, "password": password},
            headers={"content-type": "application/x-www-form-urlencoded"},
        )
        assert token_resp.status_code == 200, token_resp.text
        token_body = token_resp.json()
        assert token_body["token_type"] == "bearer"
        access_token = token_body["access_token"]
        assert isinstance(access_token, str) and access_token

        me_resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert me_resp.status_code == 200, me_resp.text
        me_body = me_resp.json()
        assert me_body["username"] == username
        assert me_body["email"] == email
    finally:
        _cleanup_user_by_email(email)
