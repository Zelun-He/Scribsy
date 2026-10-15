from app.config import Settings


def test_legacy_extra_equals_in_openai_configuration_is_normalized():
    assert Settings(openai_api_key=' =sk-test-placeholder ').openai_api_key == 'sk-test-placeholder'
    assert Settings(openai_api_key='sk-test-placeholder').openai_api_key == 'sk-test-placeholder'
    assert Settings(openai_api_key='').openai_api_key == ''


def test_provider_authentication_failure_is_actionable_and_redacted(monkeypatch):
    import asyncio
    from types import SimpleNamespace
    import httpx
    import pytest
    from fastapi import HTTPException
    from app.config import settings
    from app.services import ai_summary
    closed = []
    class FakeClient:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.complete))
        def complete(self, **kwargs):
            raise ai_summary.AuthenticationError('secret-provider-response', response=httpx.Response(401, request=httpx.Request('POST', 'https://example.com')), body=None)
        def close(self):
            closed.append(True)
    monkeypatch.setattr(settings, 'openai_api_key', 'sk-test-placeholder')
    monkeypatch.setattr(ai_summary, 'OpenAI', FakeClient)
    with pytest.raises(HTTPException) as error:
        asyncio.run(ai_summary.summarize_note('Fictional dictation.'))
    assert error.value.status_code == 503
    assert 'OPENAI_API_KEY' in error.value.detail
    assert 'secret-provider-response' not in error.value.detail
    assert closed == [True]
