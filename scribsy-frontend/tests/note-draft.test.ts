import assert from 'node:assert/strict';
import { test } from 'node:test';
import { draftKey, readDraft, writeDraft, DRAFT_LIFETIME } from '../src/lib/note-draft';

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) } as Storage;
}
test('recovery copies are scoped to the account and note and expire after one day', () => {
  const storage = memoryStorage();
  const template = { content: '', plan: '' };
  const value = { content: 'Fictional draft.', plan: 'Test follow-up.' };
  const key = draftKey(1, 22);
  writeDraft(storage, key, value, 1000);
  assert.deepEqual(readDraft(storage, key, template, 1001)?.value, value);
  assert.equal(readDraft(storage, draftKey(2, 22), template, 1001), null);
  assert.equal(readDraft(storage, draftKey(1, 23), template, 1001), null);
  assert.equal(readDraft(storage, key, template, 1000 + DRAFT_LIFETIME), null);
  assert.equal(storage.getItem(key), null);
});
test('recovery rejects invalid fields and never imports unexpected data', () => {
  const storage = memoryStorage();
  const key = draftKey(1, 'new');
  writeDraft(storage, key, { content: 'Draft', unexpected: 'ignored' }, 1000);
  assert.deepEqual(readDraft(storage, key, { content: '' }, 1001)?.value, { content: 'Draft' });
  writeDraft(storage, key, { content: 42 }, 1000);
  assert.equal(readDraft(storage, key, { content: '' }, 1001), null);
  storage.setItem(key, 'invalid JSON');
  assert.equal(readDraft(storage, key, { content: '' }, 1001), null);
});
