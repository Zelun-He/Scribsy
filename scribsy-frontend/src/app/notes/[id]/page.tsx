'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  SparklesIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { Note } from '@/types';
import { useAuth } from '@/lib/auth';

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchNote(params.id as string);
    }
  }, [params.id]);

  const fetchNote = async (noteId: string) => {
    try {
      const fetchedNote = await apiClient.getNote(parseInt(noteId));
      setNote(fetchedNote);
      setError('');
    } catch {
      setError('Failed to fetch note');
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async () => {
    if (!note || !confirm('Are you sure you want to delete this note?')) return;

    setDeleteLoading(true);
    try {
      await apiClient.deleteNote(note.id);
      router.push('/notes');
    } catch {
      setError('Failed to delete note');
      setDeleteLoading(false);
    }
  };

  const changeStatus = async (newStatus: string) => {
    if (!note) return;

    setStatusLoading(true);
    try {
      const updatedNote = await apiClient.updateNote(note.id, { status: newStatus });
      setNote(updatedNote);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'finalized':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <ClockIcon className="w-4 h-4" />;
      case 'finalized':
        return <DocumentCheckIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
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
            The note you&apos;re looking for doesn&apos;t exist.
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
            <Link href="/notes">
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Notes
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Clinical Note #{note.id}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {note.patient_first_name && note.patient_last_name ? 
                  `${note.patient_first_name} ${note.patient_last_name}` : 
                  `Patient #${note.patient_id}`
                } • Visit #{note.visit_id} • {note.note_type.charAt(0).toUpperCase() + note.note_type.slice(1)}
              </p>
              {note.patient_date_of_birth && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  DOB: {new Date(note.patient_date_of_birth).toLocaleDateString()} 
                  {note.patient_phone_number && ` • ${note.patient_phone_number}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/notes/${note.id}/edit`}>
              <Button variant="ghost">
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button
              variant="destructive"
              onClick={deleteNote}
              disabled={deleteLoading}
              loading={deleteLoading}
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Note Metadata */}
        <Card>
          <CardContent className="p-6">
            {/* Patient Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Patient Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Patient ID
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    #{note.patient_id}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                    Visit ID
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    #{note.visit_id}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
                    Note Type
                  </div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 capitalize">
                    {note.note_type}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Created: {formatDate(note.created_at)}</span>
                </div>
                {note.updated_at !== note.created_at && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Updated: {formatDate(note.updated_at)}</span>
                  </div>
                )}
              </div>
              
              {/* Status Display */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                  {getStatusIcon(note.status)}
                  <span className="capitalize">{note.status.replace('_', ' ')}</span>
                </div>
                
                {/* Status Change Buttons - Only author can finalize */}
                {note.status === 'pending_review' && note.provider_id === user?.id && (
                  <Button
                    size="sm"
                    onClick={() => changeStatus('finalized')}
                    disabled={statusLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <DocumentCheckIcon className="w-4 h-4 mr-1" />
                    Finalize Note
                  </Button>
                )}
                
                {note.status === 'draft' && note.provider_id === user?.id && (
                  <Button
                    size="sm"
                    onClick={() => changeStatus('pending_review')}
                    disabled={statusLoading}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <ClockIcon className="w-4 h-4 mr-1" />
                    Submit for Review
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Note Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Clinical Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SOAP Note - Only show if SOAP note exists in the future */}
        {/* {note.soap_note && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2" />
                SOAP Note
              </CardTitle>
              <CardDescription>
                AI-generated structured clinical documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {note.soap_note}
                </pre>
              </div>
            </CardContent>
          </Card>
        )} */}

        {/* Actions */}
        <div className="flex justify-center gap-4 py-6">
          <Link href={`/notes/${note.id}/edit`}>
            <Button size="lg">
              <PencilIcon className="w-5 h-5 mr-2" />
              Edit Note
            </Button>
          </Link>
          <Link href="/notes/new">
            <Button variant="ghost" size="lg">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Create New Note
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}