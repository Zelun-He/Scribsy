'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Note, NoteCode, NoteProvenance } from '@/types';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { burstConfetti } from '@/lib/confetti';
// Comments component removed
import { ChangeHistory } from '@/components/ui/change-history';
import { formatDateOnly } from '@/utils/date';

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { show } = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState('');
  // Comments are now handled by the Comments component
  // History is now handled by the ChangeHistory component
  const [codes, setCodes] = useState<NoteCode[]>([]);
  const [provenance, setProvenance] = useState<NoteProvenance[]>([]);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);


  useEffect(() => {
    // Wait for auth to initialize to ensure Authorization header is available
    if (authLoading) return;
    if (params.id) {
      fetchNote(params.id as string);
    }
  }, [params.id, authLoading]);

  const fetchNote = async (noteId: string) => {
    try {
      const fetchedNote = await apiClient.getNote(parseInt(noteId));
      setNote(fetchedNote);
      setError('');
      // Comments are now loaded by the Comments component
      // History is now loaded by the ChangeHistory component
      try { const cd = await apiClient.listCodes(fetchedNote.id); setCodes(cd); } catch {}
      try { const pv = await apiClient.listProvenance(fetchedNote.id); setProvenance(pv); } catch {}
    } catch (err) {
      // Fallback: fetch notes list and find the one by id to avoid any single-note endpoint issues
      try {
        const allNotes = await apiClient.getNotes({ limit: 1000 });
        const found = allNotes.find(n => n.id === parseInt(noteId));
        if (found) {
          // Try to enrich with patient info, but do not fail if it errors
          try {
            const patient = await apiClient.getPatient(found.patient_id);
            setNote({
              ...found,
              patient_first_name: patient.first_name,
              patient_last_name: patient.last_name,
              patient_date_of_birth: patient.date_of_birth,
              patient_phone_number: patient.phone_number,
              patient_email: patient.email,
            } as Note);
          } catch {
            setNote(found as Note);
          }
          setError('');
        } else {
          const message = err instanceof Error ? err.message : 'Failed to fetch note';
          setError(message);
        }
      } catch (listErr) {
        const message = listErr instanceof Error ? listErr.message : 'Failed to fetch note';
        setError(message);
      }
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

  // Comment submission is now handled by the Comments component

  const confidenceBadge = (conf?: number | null) => {
    if (conf === undefined || conf === null) return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-300">—</span>
    );
    const pct = Math.round(conf * 100);
    const color = pct >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : pct >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    return <span className={`px-2 py-0.5 text-xs rounded-full ${color}`}>{pct}%</span>;
  };

  const handleAcceptCode = async (codeId: number) => {
    if (!note) return;
    try {
      const updated = await apiClient.acceptCode(note.id, codeId);
      setCodes(prev => prev.map(c => c.id === updated.id ? updated : c));
      show('Code accepted');
    } catch (e) { show(e instanceof Error ? e.message : 'Failed to accept'); }
  };
  const handleRejectCode = async (codeId: number) => {
    if (!note) return;
    try {
      const updated = await apiClient.rejectCode(note.id, codeId);
      setCodes(prev => prev.map(c => c.id === updated.id ? updated : c));
      show('Code rejected');
    } catch (e) { show(e instanceof Error ? e.message : 'Failed to reject'); }
  };

  const playAudioSnippet = async (provenanceId: number, startMs?: number | null, endMs?: number | null) => {
    if (!note) return;
    
    // Stop current audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    
    try {
      setPlayingAudio(provenanceId);
      
      // Create audio element for streaming
      const audio = new Audio();
      audio.src = `${process.env.NEXT_PUBLIC_API_URL}/notes/${note.id}/audio?start=${startMs ?? 0}&end=${endMs ?? 0}`;
      
      audio.onended = () => setPlayingAudio(null);
      audio.onerror = () => {
        setPlayingAudio(null);
        show('Audio playback failed');
      };
      
      await audio.play();
      setAudioElement(audio);
    } catch (e) {
      setPlayingAudio(null);
      show('Audio playback failed');
    }
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setPlayingAudio(null);
  };

  const getSectionConfidence = (section: string) => {
    const sectionProvenance = provenance.filter(p => p.section === section);
    if (sectionProvenance.length === 0) return null;
    const avgConfidence = sectionProvenance.reduce((sum, p) => sum + (p.confidence || 0), 0) / sectionProvenance.length;
    return avgConfidence;
  };

  const hasLowConfidenceItems = () => {
    const lowConfidenceCodes = codes.some(c => (c.confidence || 0) < 0.6 && c.status === 'suggested');
    const lowConfidenceProvenance = provenance.some(p => (p.confidence || 0) < 0.6);
    return lowConfidenceCodes || lowConfidenceProvenance;
  };

  const changeStatus = async (newStatus: string) => {
    if (!note) return;

    // Check for low confidence items before finalizing
    if (newStatus === 'finalized' && hasLowConfidenceItems()) {
      setShowFinalizeDialog(true);
      return;
    }

    setStatusLoading(true);
    try {
      const updatedNote = await apiClient.updateNote(note.id, { status: newStatus });
      setNote(updatedNote);
      setError('');
      if (newStatus === 'finalized') {
        show('Note signed successfully');
        burstConfetti();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleFinalizeConfirm = async () => {
    setShowFinalizeDialog(false);
    await changeStatus('finalized');
  };

  const getLowConfidenceItems = () => {
    const lowCodes = codes.filter(c => (c.confidence || 0) < 0.6 && c.status === 'suggested');
    const lowProvenance = provenance.filter(p => (p.confidence || 0) < 0.6);
    return { codes: lowCodes, provenance: lowProvenance };
  };

  const exportPlain = async () => {
    if (!note) return;
    try {
      const txt = await apiClient.exportNotePlain(note.id);
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note-${note.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      show('Exported note (TXT)');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to export');
    }
  };

  const exportCCD = async () => {
    if (!note) return;
    try {
      const xml = await apiClient.exportNoteCCD(note.id);
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note-${note.id}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      show('Exported note (CCD)');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to export');
    }
  };

  const exportPDF = async () => {
    if (!note) return;
    try {
      const blob = await apiClient.exportNotePDF(note.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note-${note.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      show('Exported note (PDF)');
    } catch (e) {
      if (e instanceof Error && e.message === 'PDF_UNAVAILABLE') {
        // Client-side fallback: download TXT instead
        try {
          const txt = await apiClient.exportNotePlain(note.id);
          const blobTxt = new Blob([txt], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blobTxt);
          const a = document.createElement('a');
          a.href = url;
          a.download = `note-${note.id}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          show('PDF not available on server. Exported TXT instead.');
        } catch (e2) {
          show(e2 instanceof Error ? e2.message : 'Failed to export');
        }
      } else {
        show(e instanceof Error ? e.message : 'Failed to export');
      }
    }
  };

  const exportAudio = async () => {
    if (!note) return;
    try {
      const blob = await apiClient.exportNoteAudio(note.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note-${note.id}-audio${blob.type.includes('mp3') ? '.mp3' : blob.type.includes('wav') ? '.wav' : '.audio'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      show('Exported audio file');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to export audio');
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

  if (loading || authLoading) {
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
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-800/40 dark:border-red-800 rounded-md p-4">
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
                  DOB: {formatDateOnly(note.patient_date_of_birth)} 
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
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                    Note Type
                  </div>
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 capitalize">
                    {note.note_type}
                  </div>
                </div>
              </div>
              
              {/* AI Accuracy Display */}
              {note.accuracy_score !== undefined && note.accuracy_score !== null && (
                <div className="mt-4 p-4 rounded-lg border border-stone-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-stone-700 dark:text-gray-300 mb-1">
                        AI Accuracy
                      </div>
                      <div className="text-xs text-stone-500 dark:text-gray-400">
                        Based on content similarity to original AI generation
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        note.accuracy_score >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
                        note.accuracy_score >= 70 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                      }`}>
                        {note.accuracy_score.toFixed(1)}%
                      </div>
                      {note.content_changes_count && note.content_changes_count > 0 && (
                        <div className="text-xs text-stone-500 dark:text-gray-400">
                          {note.content_changes_count} edit{note.content_changes_count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
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

        {/* Structured Data (Codes) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">Structured Data</CardTitle>
            <CardDescription>Suggested codes with confidence. Accept to include; reject to dismiss.</CardDescription>
          </CardHeader>
          <CardContent>
            {codes.length === 0 ? (
              <div className="text-sm text-stone-500">No suggestions yet</div>
            ) : (
              <div className="divide-y divide-stone-200 dark:divide-gray-800">
                <div className="grid grid-cols-5 text-xs font-medium text-stone-600 dark:text-gray-300 pb-2">
                  <div>System</div>
                  <div>Code</div>
                  <div>Display</div>
                  <div>Confidence</div>
                  <div className="text-right pr-1">Actions</div>
                </div>
                {codes.map(c => (
                  <div key={c.id} className="grid grid-cols-5 items-center py-2">
                    <div className="text-sm text-stone-800 dark:text-gray-100">{c.system}</div>
                    <div className="text-sm font-mono text-stone-800 dark:text-gray-100">{c.code}</div>
                    <div className="text-sm text-stone-700 dark:text-gray-300 truncate" title={c.display || ''}>{c.display || '—'}</div>
                    <div>{confidenceBadge(c.confidence)}</div>
                    <div className="text-right space-x-2">
                      {c.status !== 'accepted' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAcceptCode(c.id)}>Accept</Button>
                      )}
                      {c.status !== 'rejected' && (
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleRejectCode(c.id)}>Reject</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provenance Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Provenance & Audio</span>
              {playingAudio && (
                <Button size="sm" variant="secondary" onClick={stopAudio} className="text-red-600 hover:text-red-700">
                  Stop Audio
                </Button>
              )}
            </CardTitle>
            <CardDescription>Tap sentences to play audio snippets. Confidence badges show section accuracy.</CardDescription>
          </CardHeader>
          <CardContent>
            {provenance.length === 0 ? (
              <div className="text-sm text-stone-500">No provenance data available</div>
            ) : (
              <div className="space-y-4">
                {/* Section Confidence Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['subjective', 'objective', 'assessment', 'plan'].map(section => {
                    const conf = getSectionConfidence(section);
                    return (
                      <div key={section} className="p-3 rounded-lg bg-stone-50 dark:bg-gray-800">
                        <div className="text-xs font-medium text-stone-600 dark:text-gray-300 capitalize">{section}</div>
                        <div className="mt-1">{confidenceBadge(conf)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Sentence-by-sentence provenance */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-stone-700 dark:text-gray-300">Sentences with Audio</div>
                  <div className="space-y-1">
                    {provenance.map(p => (
                      <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-gray-800">
                        <div className="flex-shrink-0 mt-1">
                          {playingAudio === p.id ? (
                            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                          ) : (
                            <button
                              onClick={() => playAudioSnippet(p.id, p.audio_start_ms, p.audio_end_ms)}
                              className="w-4 h-4 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors"
                              title="Play audio snippet"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-stone-800 dark:text-gray-100">{p.text}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {p.section && (
                              <span className="text-xs px-2 py-0.5 bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-gray-300 rounded">
                                {p.section}
                              </span>
                            )}
                            {confidenceBadge(p.confidence)}
                            {p.transcript_start_ms !== undefined && p.transcript_end_ms !== undefined && (
                              <span className="text-xs text-stone-500">
                                {Math.round(p.transcript_start_ms / 1000)}s - {Math.round(p.transcript_end_ms / 1000)}s
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full Transcript - Show if transcript exists */}
        {note.transcript && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Full Transcript
              </CardTitle>
              <CardDescription>
                Complete transcribed conversation from audio recording
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono text-sm">
                    {note.transcript}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SOAP Note - Show if any SOAP fields exist */}
        {(note.soap_subjective || note.soap_objective || note.soap_assessment || note.soap_plan) && (
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
              <div className="space-y-6">
                {note.soap_subjective && (
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2 uppercase tracking-wide">
                      Subjective
                    </h4>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {note.soap_subjective}
                      </p>
                    </div>
                  </div>
                )}
                
                {note.soap_objective && (
                  <div>
                    <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wide">
                      Objective
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {note.soap_objective}
                      </p>
                    </div>
                  </div>
                )}
                
                {note.soap_assessment && (
                  <div>
                    <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2 uppercase tracking-wide">
                      Assessment
                    </h4>
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {note.soap_assessment}
                      </p>
                    </div>
                  </div>
                )}
                
                {note.soap_plan && (
                  <div>
                    <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide">
                      Plan
                    </h4>
                    <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {note.soap_plan}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clinical Notes - Always show as fallback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Clinical Notes
            </CardTitle>
            <CardDescription>
              {note.transcript || (note.soap_subjective || note.soap_objective || note.soap_assessment || note.soap_plan) 
                ? 'Additional clinical notes and observations'
                : 'Clinical notes and observations'
              }
            </CardDescription>
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

        {/* Comments sections removed */}

        {/* Change History Section - using dedicated ChangeHistory component */}

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
          <Button variant="secondary" size="lg" onClick={exportPlain}>
            Export TXT
          </Button>
          <Button variant="secondary" size="lg" onClick={exportCCD}>
            Export CCD
          </Button>
          <Button variant="secondary" size="lg" onClick={exportPDF}>
            Export PDF
          </Button>
          {note.audio_file && (
            <Button variant="secondary" size="lg" onClick={exportAudio}>
              Export Audio
            </Button>
          )}
        </div>

        {/* Comments Section removed */}

        {/* Change History Section */}
        {note && (
          <ChangeHistory noteId={note.id} />
        )}
      </div>

      {/* Finalize Confirmation Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Low Confidence Items Detected</DialogTitle>
            <DialogDescription>
              This note contains items with low confidence scores. Review them before finalizing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {(() => {
              const lowItems = getLowConfidenceItems();
              return (
                <>
                  {lowItems.codes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Low Confidence Codes:</h4>
                      <div className="space-y-1">
                        {lowItems.codes.map(code => (
                          <div key={code.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                            <span className="text-sm">{code.system}: {code.code} - {code.display}</span>
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              {Math.round((code.confidence || 0) * 100)}% confidence
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {lowItems.provenance.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Low Confidence Text:</h4>
                      <div className="space-y-1">
                        {lowItems.provenance.slice(0, 3).map(prov => (
                          <div key={prov.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                            <span className="text-sm truncate flex-1 mr-2">{prov.text}</span>
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              {Math.round((prov.confidence || 0) * 100)}% confidence
                            </span>
                          </div>
                        ))}
                        {lowItems.provenance.length > 3 && (
                          <div className="text-xs text-amber-600 dark:text-amber-400">
                            +{lowItems.provenance.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowFinalizeDialog(false)}>
              Review Items
            </Button>
            <Button onClick={handleFinalizeConfirm} className="bg-amber-600 hover:bg-amber-700">
              Finalize Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}