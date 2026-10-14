import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_TOKEN } from '../src/lib/demo-data';

test('a demo visitor can register and switch to a real account', async () => {
  const names = ['window', 'localStorage', 'fetch'] as const;
  const originals = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const storage = new Map([['auth_token', DEMO_TOKEN]]);
  const calls: string[] = [];
  const user = { id: 71, username: 'new_clinician', email: 'clinician@example.com', is_demo: false };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { hostname: 'scribsy.vercel.app' } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async (url: string, init?: RequestInit) => {
    calls.push(url);
    if (url === '/api/auth/register') {
      assert.equal(init?.credentials, 'omit');
      assert.equal(new Headers(init?.headers).has('Authorization'), false);
      return Response.json(user);
    }
    if (url === '/api/auth/token') return Response.json({ access_token: 'real-account-session', token_type: 'bearer' });
    if (url === '/api/auth/me') return Response.json(user);
    return Response.json({ detail: 'Demo records are view-only' }, { status: 403 });
  } });
  try {
    const { apiClient } = await import('../src/lib/api');
    const credentials = { username: user.username, email: user.email, password: 'test-password' };
    assert.equal((await apiClient.register(credentials)).username, user.username);
    await apiClient.login(credentials);
    assert.equal((await apiClient.getCurrentUser()).is_demo, false);
    assert.equal(storage.get('auth_token'), 'real-account-session');
    assert.deepEqual(calls, ['/api/auth/register', '/api/auth/token', '/api/auth/me']);
  } finally {
    names.forEach((name, index) => {
      const descriptor = originals[index];
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
});
