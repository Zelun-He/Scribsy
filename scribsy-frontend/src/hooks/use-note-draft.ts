'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readDraft, writeDraft, type Recovery } from '@/lib/note-draft';
import { useUnsavedWarning } from './use-unsaved-warning';

export function useNoteDraft<T extends Record<string, string>>({ scope, value, initial, apply, save, enabled = true }: {
  scope: string; value: T; initial: T; apply: (value: T) => void;
  save?: (value: T) => Promise<unknown>; enabled?: boolean;
}) {
  const latest = useRef(value); latest.current = value;
  const baseline = useRef(JSON.stringify(initial));
  const saveRef = useRef(save); saveRef.current = save;
  const [savedJSON, setSavedJSON] = useState(baseline.current);
  const [pending, setPending] = useState<Recovery<T> | null>(null);
  const pendingRef = useRef(pending); pendingRef.current = pending;
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'saved' | 'pending' | 'saving' | 'error'>('saved');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const running = useRef<Promise<void> | null>(null);
  const alive = useRef(true);
  const enabledRef = useRef(enabled); enabledRef.current = enabled;
  const serialized = JSON.stringify(value);
  const dirty = enabled && serialized !== savedJSON;

  useEffect(() => {
    alive.current = true;
    try {
      if (enabled) {
        const copy = readDraft(window.sessionStorage, scope, initial);
        if (copy && JSON.stringify(copy.value) !== baseline.current) setPending(copy);
      } else window.sessionStorage.removeItem(scope);
    } catch { setStorageError(true); }
    setReady(true);
    return () => { alive.current = false; };
    // The editor is keyed by account and note; initial is its server snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, enabled]);

  useEffect(() => {
    if (!ready || !enabled || pending || !dirty) return;
    try { writeDraft(window.sessionStorage, scope, value); } catch { setStorageError(true); }
    if (!running.current) setStatus('pending');
  }, [scope, ready, enabled, pending, dirty, serialized]);

  const clear = useCallback(() => {
    baseline.current = JSON.stringify(latest.current);
    setSavedJSON(baseline.current);
    pendingRef.current = null;
    setPending(null);
    setStatus('saved');
    try { window.sessionStorage.removeItem(scope); } catch { /* Storage unavailable. */ }
  }, [scope]);

  const flush = useCallback(async () => {
    if (!saveRef.current || !enabledRef.current || pendingRef.current) return;
    if (running.current) return running.current;
    const work = async () => {
      try {
        while (enabledRef.current && JSON.stringify(latest.current) !== baseline.current) {
          const snapshot = { ...latest.current };
          const snapshotJSON = JSON.stringify(snapshot);
          if (alive.current) { setStatus('saving'); setError(''); }
          await saveRef.current!(snapshot);
          baseline.current = snapshotJSON;
          // A slow response never replaces newer text in the editor.
          if (alive.current) setSavedJSON(snapshotJSON);
          try {
            const stored = readDraft(window.sessionStorage, scope, snapshot);
            if (stored && JSON.stringify(stored.value) === snapshotJSON) window.sessionStorage.removeItem(scope);
          } catch { /* Keep editing if storage is disabled. */ }
        }
        if (alive.current) setStatus('saved');
      } catch (failure) {
        if (alive.current) { setStatus('error'); setError(failure instanceof Error ? failure.message : 'Could not save changes.'); }
        throw failure;
      }
    };
    running.current = work();
    try { await running.current; } finally { running.current = null; }
  }, [scope]);

  useEffect(() => {
    if (!ready || !enabled || !save || pending || !dirty) return;
    const timer = setTimeout(() => { void flush().catch(() => {}); }, 1000);
    return () => clearTimeout(timer);
  }, [ready, enabled, !!save, pending, serialized, dirty, flush]);

  useUnsavedWarning(() => enabledRef.current && (JSON.stringify(latest.current) !== baseline.current || !!pendingRef.current));
  return {
    dirty, ready, pending, status, error, storageError, flush, clear,
    restore: () => { if (pending) apply(pending.value); pendingRef.current = null; setPending(null); },
    discard: () => { pendingRef.current = null; setPending(null); try { window.sessionStorage.removeItem(scope); } catch {} },
  };
}
