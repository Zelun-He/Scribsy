'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

interface Note {
  id: string;
  title: string;
  content: string;
  soap_note?: string;
  created_at: string;
  updated_at: string;
}

export default function EditNotePage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [soapNote, setSoapNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchNote(params.id as string);
    }
  }, [params.id]);

  const fetchNote = async (noteId: string) => {
    try {
      const fetchedNote = await apiClient.getNote(noteId);
      setNote(fetchedNote);
      setTitle(fetchedNote.title);
      setContent(fetchedNote.content);
      setSoapNote(fetchedNote.soap_note || '');
      setError('');
    } catch (err) {
      setError('Failed to fetch note');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;

    setSaving(true);
    setError('');

    try {
      const updatedNote = await apiClient.updateNote(note.id, {
        title: title || 'Untitled Note',
        content,
        soap_note: soapNote || undefined,
      });
      
      router.push(`/notes/${updatedNote.id}`);
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
              <Button variant="outline">
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
            The note you're trying to edit doesn't exist.
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
            <Link href={`/notes/${note.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Note
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Edit Note
            </h1>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            loading={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <Card>
            <CardHeader>
              <CardTitle>Note Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter note title"
                required
              />
            </CardContent>
          </Card>

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

          {/* SOAP Note */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2" />
                SOAP Note
              </CardTitle>
              <CardDescription>
                Edit the structured clinical documentation (optional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={soapNote}
                onChange={(e) => setSoapNote(e.target.value)}
                placeholder="SOAP note content (optional)..."
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href={`/notes/${note.id}`}>
              <Button variant="outline" type="button">
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