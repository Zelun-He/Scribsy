'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeftIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { Note } from '@/types';
import { useToast } from '@/lib/toast';
import { recordNoteSession } from '@/lib/metrics';

export default function EditNotePage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { show } = useToast();
  const draftKey = useMemo(() => (note?.id ? `draft:edit:${note.id}` : 'draft:edit:anon'), [note]);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchNote(params.id as string);
    }
  }, [params.id]);

  const fetchNote = async (noteId: string) => {
    try {
      const fetchedNote = await apiClient.getNote(parseInt(noteId));
      setNote(fetchedNote);
      setContent(fetchedNote.content);
      setError('');
    } catch {
      setError('Failed to fetch note');
    } finally {
      setLoading(false);
    }
  };

  // Restore local draft when note loads
  useEffect(() => {
    if (!note) return;
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(draftKey) : null;
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft.content === 'string' && draft.content) {
          setContent(draft.content);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  // Debounced local draft autosave
  useEffect(() => {
    if (!note) return;
    setDraftSaving(true);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(draftKey, JSON.stringify({ content }));
          setDraftSavedAt(Date.now());
        }
      } catch {}
      setDraftSaving(false);
    }, 800);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [content, draftKey, note]);

  // Tick for relative time label
  useEffect(() => {
    if (!draftSavedAt) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [draftSavedAt]);

  const savedLabel = draftSaving ? 'Saving…' : (draftSavedAt ? `Saved ${Math.max(0, Math.round((nowTick - draftSavedAt) / 1000))}s ago` : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;

    setSaving(true);
    setError('');

    try {
      const startedAt = Date.now();
      const updatedNote = await apiClient.updateNote(note.id, {
        content,
      });
      const savedAt = Date.now();
      try { recordNoteSession(null, updatedNote.id, 'edit', startedAt, savedAt); } catch {}
      show('Saved just now');
      router.push(`/notes/${updatedNote.id.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !note) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <div className="mt-4">
            <Link href="/notes">
              <Button variant="ghost">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Notes
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!note) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Note not found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The note you&apos;re trying to edit doesn&apos;t exist.
          </p>
          <div className="mt-6">
            <Link href="/notes">
              <Button>
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Notes
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/notes/${note.id.toString()}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Note
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Edit Note
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {savedLabel && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{savedLabel}</span>
            )}
            <Button
              onClick={handleSubmit}
              disabled={saving}
              loading={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Clinical Notes
              </CardTitle>
              <CardDescription>
                Edit your clinical documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your clinical notes here..."
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                required
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href={`/notes/${note.id.toString()}`}>
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}