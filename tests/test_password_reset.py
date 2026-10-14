"""Exercise recovery through real API/database/password hashing with captured local email."""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.db import models
from app.db.database import SessionLocal
from app.api.endpoints import auth
from app.services.email_service import EmailService


@pytest.fixture
def recovery(monkeypatch):
    monkeypatch.setenv('FRONTEND_URL', 'https://scribsy.vercel.app/')
    monkeypatch.setattr(auth.email_service, 'is_configured', lambda: True)
    mail = []
    monkeypatch.setattr(auth.email_service, 'send_password_reset_email', lambda **kw: mail.append(kw) or True)
    name = 'reset_' + uuid.uuid4().hex[:12]
    client = TestClient(app)
    account = {'username': name, 'email': name + '@example.com', 'password': 'Original123'}
    assert client.post('/auth/register', json=account).status_code == 200
    return client, account, mail


def request_link(recovery):
    client, account, mail = recovery
    response = client.post('/auth/request-password-reset', json={'email': ' ' + account['email'].upper() + ' '})
    assert response.status_code == 200, response.text
    assert len(mail) == 1
    return mail[0]['reset_token']


def test_real_recovery_changes_password_once_and_revokes_previous_sessions(recovery):
    client, account, mail = recovery
    old_session = client.post('/auth/token', data=account).json()['access_token']
    legacy_session = auth.create_access_token({'sub': account['username']})
    token = request_link(recovery)
    url = urlsplit(mail[0]['reset_url'])
    assert (url.scheme, url.netloc, url.path) == ('https', 'scribsy.vercel.app', '/auth/reset-password')
    assert parse_qs(url.query)['token'] == [token]
    with SessionLocal() as db:
        stored = db.query(models.PasswordResetToken).filter_by(token='sha256:' + hashlib.sha256(token.encode()).hexdigest()).one()
        assert stored.token != token
        assert client.post('/auth/verify-password-reset', json={'token': stored.token, 'new_password': 'NewSecret123'}).status_code == 422
    response = client.post('/auth/verify-password-reset', json={'token': token, 'new_password': 'NewSecret123'})
    assert response.status_code == 200, response.text
    assert client.post('/auth/verify-password-reset', json={'token': token, 'new_password': 'OtherSecret123'}).status_code == 400
    for session in [old_session, legacy_session]:
        headers = {'Authorization': 'Bearer ' + session}
        assert client.get('/auth/me', headers=headers).status_code == 401
        assert client.post('/auth/refresh', headers=headers).status_code == 401
    assert client.post('/auth/token', data=account).status_code == 401
    new_session = client.post('/auth/token', data={'username': account['email'], 'password': 'NewSecret123'})
    assert new_session.status_code == 200, new_session.text
    assert client.get('/auth/me', headers={'Authorization': 'Bearer ' + new_session.json()['access_token']}).status_code == 200


def test_cooldown_expiration_and_replacement(recovery):
    client, account, mail = recovery
    first = request_link(recovery)
    assert client.post('/auth/request-password-reset', json={'email': account['email']}).status_code == 200
    assert len(mail) == 1
    with SessionLocal() as db:
        user = db.query(models.User).filter_by(username=account['username']).one()
        user_id = user.id
        db.query(models.PasswordResetToken).filter_by(user_id=user_id).update({'created_at': datetime.now(timezone.utc)-timedelta(minutes=2)})
        db.commit()
    assert client.post('/auth/request-password-reset', json={'email': account['email']}).status_code == 200
    assert len(mail) == 2
    assert client.post('/auth/verify-password-reset', json={'token': first, 'new_password': 'NewSecret123'}).status_code == 400
    with SessionLocal() as db:
        db.query(models.PasswordResetToken).filter_by(user_id=user_id).update({'expires_at': datetime.now(timezone.utc)-timedelta(seconds=1)})
        db.commit()
    assert client.post('/auth/verify-password-reset', json={'token': mail[1]['reset_token'], 'new_password': 'NewSecret123'}).status_code == 400


def test_delivery_failure_rolls_back_and_preserves_previous_link(recovery, monkeypatch):
    client, account, mail = recovery
    token = request_link(recovery)
    with SessionLocal() as db:
        db.query(models.PasswordResetToken).filter_by(token='sha256:' + hashlib.sha256(token.encode()).hexdigest()).update({'created_at': datetime.now(timezone.utc)-timedelta(minutes=2)})
        db.commit()
    monkeypatch.setattr(auth.email_service, 'send_password_reset_email', lambda **kw: False)
    assert client.post('/auth/request-password-reset', json={'email': account['email']}).status_code == 503
    assert client.post('/auth/verify-password-reset', json={'token': token, 'new_password': 'NewSecret123'}).status_code == 200


def test_configuration_missing_unknown_account_and_validation(recovery, monkeypatch):
    client, account, mail = recovery
    assert client.post('/auth/request-password-reset', json={'email': 'missing-account@example.com'}).status_code == 200
    assert not mail
    assert client.post('/auth/request-password-reset', json={'email': 'not an email'}).status_code == 422
    monkeypatch.setattr(auth.email_service, 'is_configured', lambda: False)
    for email in [account['email'], 'missing-account@example.com']:
        response = client.post('/auth/request-password-reset', json={'email': email})
        assert response.status_code == 503
        assert 'unavailable' in response.json()['detail']
    assert not mail


@pytest.mark.parametrize('password', ['short1', 'NoNumbersHere', '漢'*25+'1'])
def test_weak_or_overlong_password_does_not_consume_token(recovery, password):
    client, _, _ = recovery
    token = request_link(recovery)
    assert client.post('/auth/verify-password-reset', json={'token': token, 'new_password': password}).status_code == 400
    assert client.post('/auth/verify-password-reset', json={'token': token, 'new_password': 'NewSecret123'}).status_code == 200


def test_trusted_frontend_origin(recovery, monkeypatch):
    client, account, mail = recovery
    monkeypatch.setenv('FRONTEND_URL', 'http://malicious.example')
    assert client.post('/auth/request-password-reset', json={'email': account['email']}).status_code == 503
    assert not mail
    monkeypatch.delenv('FRONTEND_URL')
    monkeypatch.setattr(settings, 'debug', False)
    assert auth.reset_frontend_url() == 'https://scribsy.vercel.app'


def test_legacy_link_still_works(recovery):
    client, account, _ = recovery
    token = secrets.token_urlsafe(32)
    with SessionLocal() as db:
        user = db.query(models.User).filter_by(username=account['username']).one()
        db.add(models.PasswordResetToken(user_id=user.id, tenant_id=user.tenant_id, token=token, expires_at=datetime.now(timezone.utc)+timedelta(minutes=30)))
        db.commit()
    assert client.post('/auth/verify-password-reset', json={'token': token, 'new_password': 'NewSecret123'}).status_code == 200


def test_resend_transport_timeout_and_html_escaping(monkeypatch):
    monkeypatch.setenv('RESEND_API_KEY', 'test-only-api-key')
    monkeypatch.setenv('EMAIL_FROM', 'Scribsy <support@example.com>')
    captured = []
    class Response:
        status_code = 200
        def json(self): return {'id': 'fake-local-delivery-id'}
    def post(url, **kwargs):
        captured.append((url, kwargs))
        return Response()
    monkeypatch.setattr('app.services.email_service.requests.post', post)
    service = EmailService()
    assert service.is_configured()
    assert service.send_password_reset_email('qa@example.com', '<script>bad</script>', 'test-token', 'https://scribsy.vercel.app/auth/reset-password?token=test-token')
    url, request = captured[0]
    assert url == 'https://api.resend.com/emails'
    assert request['timeout'] == 10 and request['allow_redirects'] is False
    assert '<script>' not in request['json']['html']
    assert '&lt;script&gt;' in request['json']['html']
    assert request['json']['to'] == ['qa@example.com']
    Response.status_code = 403
    assert not service.send_password_reset_email('qa@example.com', 'qa', 'test-token', 'https://scribsy.vercel.app/reset')


def test_hourly_send_limit(recovery):
    client, account, mail = recovery
    for index in range(4):
        assert client.post('/auth/request-password-reset', json={'email': account['email']}).status_code == 200
        with SessionLocal() as db:
            user = db.query(models.User).filter_by(username=account['username']).one()
            db.query(models.PasswordResetToken).filter_by(user_id=user.id).update({'created_at': datetime.now(timezone.utc)-timedelta(minutes=2)})
            db.commit()
    assert len(mail) == 3


@pytest.mark.parametrize('port', [465, 587])
def test_authenticated_smtp_supports_ssl_and_starttls(monkeypatch, port):
    monkeypatch.delenv('RESEND_API_KEY', raising=False)
    monkeypatch.setenv('SMTP_PORT', str(port))
    monkeypatch.setenv('SMTP_USERNAME', 'sender@example.com')
    monkeypatch.setenv('SMTP_PASSWORD', 'local-test-password')
    calls = []
    class SMTP:
        def __init__(self, host, actual_port, **kwargs):
            assert actual_port == port and kwargs['timeout'] == 10
            assert ('context' in kwargs) == (port == 465)
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def starttls(self, **kwargs): calls.append('tls')
        def login(self, *args): calls.append('login')
        def send_message(self, message):
            assert message['To'] == 'qa@example.com'
            calls.append('send')
            return {}
    monkeypatch.setattr('app.services.email_service.smtplib.SMTP', SMTP)
    monkeypatch.setattr('app.services.email_service.smtplib.SMTP_SSL', SMTP)
    assert EmailService().send_password_reset_email('qa@example.com', 'qa', 'test-token', 'https://scribsy.vercel.app/reset')
    assert calls == (['login', 'send'] if port == 465 else ['tls', 'login', 'send'])
