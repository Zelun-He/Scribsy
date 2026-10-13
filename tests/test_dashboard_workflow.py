import io
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db import models
from app.services.ai_summary import NoteSummary


def account(client):
    username = f"clinician_{uuid.uuid4().hex[:10]}"
    registration = client.post('/auth/register', json={'username': username, 'email': f'{username}@example.com', 'password': 'Pass123456!'})
    assert registration.status_code == 200, registration.text
    login = client.post('/auth/token', data={'username': username, 'password': 'Pass123456!'})
    assert login.status_code == 200, login.text
    return {'Authorization': f"Bearer {login.json()['access_token']}"}, registration.json()


def patient(client, headers):
    response = client.post('/patients', headers=headers, json={'first_name': 'Morgan', 'last_name': 'Test', 'date_of_birth': '1990-03-12'})
    assert response.status_code == 200, response.text
    return response.json()


def test_saved_dashboard_review_finalize_export_and_account_isolation():
    with TestClient(app) as client:
        owner, user = account(client)
        other, other_user = account(client)
        assert client.get('/dashboard').status_code == 401
        assert client.get('/dashboard', headers=owner).json() == {'patients': [], 'notes': [], 'appointments': []}
        own_patient = patient(client, owner)
        other_patient = patient(client, other)
        payload = {'patient_id': own_patient['id'], 'provider_id': other_user['id'], 'note_type': 'Consultation', 'content': 'Visit notes.', 'status': 'pending_review', 'transcript': 'Provider dictation.', 'soap_subjective': 'Reported symptoms.', 'soap_objective': 'Exam findings.', 'soap_assessment': 'Provider assessment.', 'soap_plan': 'Follow-up plan.', 'time_saved_minutes': 12}
        cross = client.post('/notes/create-json', headers=owner, json={**payload, 'patient_id': other_patient['id']})
        assert cross.status_code == 404
        created = client.post('/notes/create-json', headers=owner, json={**payload, 'tenant_id': 'spoofed'})
        assert created.status_code == 200, created.text
        note_id = created.json()['id']
        assert created.json()['provider_id'] == user['id']
        assert created.json()['tenant_id'] == user['tenant_id']
        for _ in range(12):
            assert client.post('/notes/create-json', headers=owner, json=payload).status_code == 200
        snapshot = client.get('/dashboard', headers=owner).json()
        assert len(snapshot['notes']) == 13  # Dashboard isn't truncated at the notes list's ten-row default.
        assert len(snapshot['patients']) == 1
        assert not client.get('/dashboard', headers=other).json()['notes']
        detail = client.get(f'/notes/{note_id}', headers=owner)
        assert detail.status_code == 200
        assert detail.json()['transcript'] == payload['transcript']
        assert detail.json()['soap_plan'] == payload['soap_plan']
        assert detail.json()['time_saved_minutes'] == 12
        assert client.get(f'/notes/{note_id}', headers=other).status_code == 404
        assert client.put(f'/notes/{note_id}', headers=other, json={'content': 'Wrong account'}).status_code == 404
        update = client.put(f'/notes/{note_id}', headers=owner, json={'content': 'Updated clinical note.', 'soap_plan': 'Updated follow-up plan.'})
        assert update.status_code == 200, update.text
        assert update.json()['content_changes_count'] == 1
        final = client.put(f'/notes/{note_id}', headers=owner, json={'status': 'finalized'})
        assert final.status_code == 200, final.text
        assert final.json()['signed_at']
        plain = client.get(f'/notes/{note_id}/export/plain', headers=owner)
        assert 'Updated follow-up plan.' in plain.text
        assert client.put(f'/notes/{note_id}', headers=owner, json={'content': 'Overwrite signed record'}).status_code == 409
        assert client.post(f'/notes/{note_id}/generate-soap', headers=owner).status_code == 409
        pdf = client.get(f'/notes/{note_id}/export/pdf', headers=owner)
        assert pdf.status_code == 200, pdf.text
        assert pdf.content.startswith(b'%PDF')
        assert client.get(f'/notes/{note_id}/export/pdf', headers=other).status_code == 404
        assert client.get('/notes/timing-stats', headers=owner).status_code == 200


def test_appointment_check_in_and_schedule_persistence():
    with TestClient(app) as client:
        owner, _ = account(client)
        other, _ = account(client)
        own_patient = patient(client, owner)
        response = client.post(f"/patients/{own_patient['id']}/appointments", headers=owner, json={'patient_id': own_patient['id'], 'scheduled_at': (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(), 'title': 'Follow-up'})
        assert response.status_code == 200, response.text
        appt_id = response.json()['id']
        assert len(client.get('/dashboard', headers=owner).json()['appointments']) == 1
        assert client.get('/dashboard', headers=other).json()['appointments'] == []
        assert client.post(f'/patients/appointments/{appt_id}/check-in', headers=other).status_code == 404
        checked_in = client.post(f'/patients/appointments/{appt_id}/check-in', headers=owner)
        assert checked_in.status_code == 200, checked_in.text
        assert checked_in.json()['status'] == 'checked_in'
        assert checked_in.json()['checked_in_at']
        assert client.get('/dashboard', headers=owner).json()['appointments'][0]['status'] == 'checked_in'


def test_audio_transcript_summary_and_saved_note(monkeypatch):
    from app.api.endpoints import transcribe, notes
    calls = []
    async def fake_transcription(path):
        assert path.exists()
        calls.append('transcribe')
        return 'Patient describes the symptoms; provider documents the exam and follow-up.'
    async def fake_summary(*args, **kwargs):
        calls.append('summary')
        return NoteSummary(subjective='Symptoms described.', objective='Exam documented.', assessment='Provider assessment.', plan='Follow-up documented.')
    monkeypatch.setattr(transcribe.transcription_service, 'transcribe', fake_transcription)
    monkeypatch.setattr(transcribe, 'summarize_note', fake_summary)
    monkeypatch.setattr(notes, 'summarize_note', fake_summary)
    with TestClient(app) as client:
        headers, _ = account(client)
        own_patient = patient(client, headers)
        response = client.post('/transcribe?summarize=true', headers=headers, files={'file': ('recording.webm', io.BytesIO(b'audio-fixture'), 'audio/webm')})
        assert response.status_code == 200, response.text
        output = response.json()
        saved = client.post('/notes', headers=headers, data={'patient_id': own_patient['id'], 'note_type': 'Follow-up', 'content': output['transcript'], 'status': 'pending_review', 'transcript': output['transcript'], 'soap_subjective': output['summary']['subjective'], 'soap_objective': output['summary']['objective'], 'soap_assessment': output['summary']['assessment'], 'soap_plan': output['summary']['plan'], 'auto_transcribe': 'false', 'auto_summarize': 'false'}, files={'audio_file': ('recording.webm', io.BytesIO(b'audio-fixture'), 'audio/webm')})
        assert saved.status_code == 200, saved.text
        assert calls == ['transcribe', 'summary']  # Save doesn't repeat the AI processing.
        detail = client.get(f"/notes/{saved.json()['id']}", headers=headers).json()
        assert detail['soap_plan'] == 'Follow-up documented.'
        assert detail['transcript'] == output['transcript']
        audio = client.get(f"/notes/{saved.json()['id']}/export/audio", headers=headers)
        assert audio.status_code == 200, audio.text
        assert audio.content == b'audio-fixture'


def test_missing_ai_key_preserves_manual_work_and_bypass_routes_are_disabled():
    with TestClient(app) as client:
        headers, _ = account(client)
        failure = client.post('/notes/summarize-text', headers=headers, json={'text': 'Provider dictation'})
        assert failure.status_code == 503
        assert 'API key' in failure.json()['detail']
        for path in ['/emergency-users', '/working-users', '/simple-users']:
            assert client.get(path).status_code == 404


def test_preferences_can_be_saved_without_deadlock(monkeypatch, tmp_path):
    from app.services import preferences
    from concurrent.futures import ThreadPoolExecutor
    monkeypatch.setattr(preferences, 'DATA_DIR', str(tmp_path))
    monkeypatch.setattr(preferences, 'PREFS_PATH', str(tmp_path / 'preferences.json'))
    with ThreadPoolExecutor() as executor:
        saved = executor.submit(preferences.save_user_preferences, 9001, {'verbosity': 'detailed'}).result(timeout=2)
    assert saved['verbosity'] == 'detailed'
    assert preferences.load_user_preferences(9001)['verbosity'] == 'detailed'


def test_partial_soap_requires_completion_before_finalization():
    with TestClient(app) as client:
        headers, user = account(client)
        own_patient = patient(client, headers)
        created = client.post('/notes/create-json', headers=headers, json={'patient_id': own_patient['id'], 'provider_id': user['id'], 'note_type': 'Follow-up', 'content': 'Visit notes.', 'status': 'pending_review', 'soap_subjective': 'Reported symptoms.'})
        assert created.status_code == 200
        note_id = created.json()['id']
        assert client.put(f'/notes/{note_id}', headers=headers, json={'status': 'finalized'}).status_code == 400
        filled = client.put(f'/notes/{note_id}', headers=headers, json={'soap_objective': 'Not documented.', 'soap_assessment': 'Not documented.', 'soap_plan': 'Not documented.'})
        assert filled.status_code == 200
        assert client.put(f'/notes/{note_id}', headers=headers, json={'status': 'finalized'}).status_code == 200


def test_structured_ai_response_preserves_multiline_sections(monkeypatch):
    import asyncio
    import json
    from types import SimpleNamespace
    from app.services import ai_summary
    from app.config import settings
    summary = {'subjective': 'First symptom.\nSecond symptom.', 'objective': '', 'assessment': 'Documented assessment.', 'plan': 'Follow-up.'}
    captured = {}
    class FakeClient:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.complete))
        def complete(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(summary)))])
        def close(self):
            pass
    monkeypatch.setattr(settings, 'openai_api_key', 'test-key-not-sent')
    monkeypatch.setattr(ai_summary, 'OpenAI', FakeClient)
    result = asyncio.run(ai_summary.summarize_note('Provider dictation.', preferences={'format': 'narrative'}))
    assert result.model_dump() == summary
    assert captured['response_format'] == {'type': 'json_object'}
