export const DRAFT_PREFIX = 'scribsy:draft:v1:';
export const DRAFT_LIFETIME = 24 * 60 * 60 * 1000;
export interface Recovery<T> { version: 1; expiresAt: number; value: T; }
export function draftKey(account: number, note: number | 'new') { return `${DRAFT_PREFIX}${account}:${note}`; }
export function readDraft<T>(storage: Storage, key: string, template: T, now = Date.now()): Recovery<T> | null {
  try {
    const saved = JSON.parse(storage.getItem(key) || 'null');
    if (!saved || saved.version !== 1 || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= now || saved.expiresAt > now + DRAFT_LIFETIME || !saved.value || typeof saved.value !== 'object') {
      storage.removeItem(key); return null;
    }
    // Drafts contain only the expected string fields, never files or account data.
    const fields = Object.keys(template as object);
    if (fields.some(field => typeof saved.value[field] !== 'string')) { storage.removeItem(key); return null; }
    return { version: 1, expiresAt: saved.expiresAt, value: Object.fromEntries(fields.map(field => [field, saved.value[field]])) as T };
  } catch { return null; }
}
export function writeDraft<T>(storage: Storage, key: string, value: T, now = Date.now()) {
  storage.setItem(key, JSON.stringify({ version: 1, expiresAt: now + DRAFT_LIFETIME, value }));
}
export function clearRecoveryCopies() {
  if (typeof window === 'undefined') return;
  try {
    for (const key of Object.keys(window.sessionStorage)) if (key.startsWith(DRAFT_PREFIX)) window.sessionStorage.removeItem(key);
  } catch { /* The browser may disable storage. */ }
}
