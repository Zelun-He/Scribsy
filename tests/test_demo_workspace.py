import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.db.database import SessionLocal
from app.db import models
from app.services.demo_workspace import ensure_demo_workspace, DEMO_USERNAME, DEMO_PASSWORD


def demo_session(client):
    response = client.post('/auth/token', data={'username': DEMO_USERNAME, 'password': DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def test_demo_login_browsing_isolation_and_write_restrictions():
    with TestClient(app) as client:
        headers = demo_session(client)
        assert client.get('/auth/me', headers=headers).json()['is_demo'] is True
        assert client.post('/auth/token', data={'username': DEMO_USERNAME, 'password': 'incorrect'}).status_code == 401
        snapshot = client.get('/dashboard', headers=headers).json()
        assert len(snapshot['patients']) == 3
        assert len(snapshot['notes']) == 6
        assert len(snapshot['appointments']) == 3
        note_id = snapshot['notes'][0]['id']
        patient_id = snapshot['patients'][0]['id']
        assert client.get(f'/notes/{note_id}', headers=headers).status_code == 200
        assert client.get(f'/notes/{note_id}/export/pdf', headers=headers).status_code == 200
        assert client.post('/auth/refresh', headers=headers).status_code == 200
        for method, path, body in [
            ('put', f'/notes/{note_id}', {'content': 'Should never be saved'}),
            ('delete', f'/notes/{note_id}', None),
            ('post', f'/notes/{note_id}/generate-soap', None),
            ('post', '/notes/summarize-text', {'text': 'Should never run AI'}),
            ('post', '/patients', {'first_name': 'Real', 'last_name': 'Input', 'date_of_birth': '2000-01-01'}),
            ('delete', f'/patients/{patient_id}', None),
        ]:
            response = getattr(client, method)(path, headers=headers, **({'json': body} if body else {}))
            assert response.status_code == 403, (path, response.text)
        assert client.get('/admin/users', headers=headers).status_code == 403
        # A regular account and its patient remain outside the shared workspace.
        unique = uuid.uuid4().hex[:10]
        username = f'private_{unique}'
        assert client.post('/auth/register', json={'username': username, 'email': f'{unique}@example.com', 'password': 'private123'}).status_code == 200
        token = client.post('/auth/token', data={'username': username, 'password': 'private123'}).json()['access_token']
        private_headers = {'Authorization': 'Bearer ' + token}
        patient = client.post('/patients', headers=private_headers, json={'first_name': 'Private', 'last_name': 'Record', 'date_of_birth': '2000-01-01'}).json()
        assert client.get(f"/patients/{patient['id']}", headers=headers).status_code == 404
        assert client.get(f'/notes/{note_id}', headers=private_headers).status_code == 404
        assert len(client.get('/patients', headers=headers).json()) == 3
        assert client.post('/auth/register', json={'username': ' TESTUSER ', 'email': 'reserved@example.com', 'password': 'private123'}).status_code == 400


def test_demo_seed_is_idempotent_and_can_be_disabled(monkeypatch):
    ensure_demo_workspace()
    with SessionLocal() as db:
        user = db.query(models.User).filter_by(username=DEMO_USERNAME).one()
        counts = (db.query(models.Patient).filter_by(user_id=user.id).count(),
                  db.query(models.Note).filter_by(provider_id=user.id).count(),
                  db.query(models.Appointment).filter_by(user_id=user.id).count())
    ensure_demo_workspace()
    with SessionLocal() as db:
        assert counts == (db.query(models.Patient).filter_by(user_id=user.id).count(),
                          db.query(models.Note).filter_by(provider_id=user.id).count(),
                          db.query(models.Appointment).filter_by(user_id=user.id).count())
    client = TestClient(app)
    headers = demo_session(client)
    monkeypatch.setattr(settings, 'demo_enabled', False)
    assert client.get('/dashboard', headers=headers).status_code == 403
    assert client.post('/auth/token', data={'username': DEMO_USERNAME, 'password': DEMO_PASSWORD}).status_code == 401
    assert client.post('/auth/demo').status_code == 503


def test_demo_password_reset_does_not_issue_tokens():
    ensure_demo_workspace()
    with SessionLocal() as db:
        user = db.query(models.User).filter_by(username=DEMO_USERNAME).one()
        before = db.query(models.PasswordResetToken).filter_by(user_id=user.id).count()
    response = TestClient(app).post('/auth/request-password-reset', json={'email': 'public-demo@scribsy.example'})
    assert response.status_code == 200, response.text
    with SessionLocal() as db:
        assert db.query(models.PasswordResetToken).filter_by(user_id=user.id).count() == before


def test_demo_button_uses_a_normal_cookie_session():
    ensure_demo_workspace()
    client = TestClient(app)
    response = client.post('/auth/demo')
    assert response.status_code == 200, response.text
    assert 'HttpOnly' in response.headers['set-cookie']
    assert client.get('/auth/me').json()['is_demo'] is True
    assert client.get('/dashboard').status_code == 200
    assert client.post('/auth/refresh').status_code == 200


def test_seed_and_demo_login_do_not_take_over_an_existing_account(monkeypatch):
    from app.services import demo_workspace
    from app.crud.notes import get_password_hash
    username = 'legacy_' + uuid.uuid4().hex[:10]
    hashed = get_password_hash('private-password')
    with SessionLocal() as db:
        db.add(models.User(username=username, email=f'{username}@example.com',
                           hashed_password=hashed, role='provider', tenant_id='private-legacy'))
        db.commit()
    monkeypatch.setattr(demo_workspace, 'DEMO_USERNAME', username)
    with pytest.raises(RuntimeError, match='not changed'):
        ensure_demo_workspace()
    assert TestClient(app).post('/auth/demo').status_code == 503
    with SessionLocal() as db:
        user = db.query(models.User).filter_by(username=username).one()
        assert user.hashed_password == hashed
        assert user.tenant_id == 'private-legacy'
        assert not user.is_demo
