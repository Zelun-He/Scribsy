import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiClient } from '../src/lib/api';

test('audio upload refreshes authentication, includes cookies, and lets the browser set its multipart boundary', async () => {
  const original = globalThis.fetch;
  const storage = new Map<string, string>([['auth_token', 'fresh-test-token']]);
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => storage.get(key) ?? null }, configurable: true });
  const file = new File(['fictional audio fixture'], 'test.wav', { type: 'audio/wav' });
  try {
    globalThis.fetch = async (_url, init) => {
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer fresh-test-token');
      assert.equal(new Headers(init?.headers).has('Content-Type'), false);
      assert.equal(init?.credentials, 'include');
      assert.equal((init?.body as FormData).get('file'), file);
      return new Response(JSON.stringify({ transcript: 'Fictional transcript.' }), { status: 200 });
    };
    assert.equal((await apiClient.transcribeAudio(file)).transcript, 'Fictional transcript.');
    globalThis.fetch = async () => new Response('Application failed to respond', { status: 502 });
    await assert.rejects(apiClient.transcribeAudio(file), /audio is still attached/);
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(apiClient.transcribeAudio(file), /Check your connection/);
    assert.equal(file.size, 23);
  } finally {
    globalThis.fetch = original;
    Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: previousStorage, configurable: true });
  }
});
