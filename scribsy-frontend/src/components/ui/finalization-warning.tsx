'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface FinalizationWarningProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingNote {
  id: number;
  title: string;
  status: string;
  created_at: string;
  patient_id: number;
}

export function FinalizationWarning({ isOpen, onClose }: FinalizationWarningProps) {
  const [pendingNotes, setPendingNotes] = useState<PendingNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadPendingNotes();
    }
  }, [isOpen]);

  const loadPendingNotes = async () => {
    setLoading(true);
    try {
      const notes = await apiClient.getPendingNotesToday();
      setPendingNotes(notes);
    } catch (error) {
      console.error('Failed to load pending notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeNote = async (noteId: number) => {
    setFinalizing(noteId);
    try {
      await apiClient.updateNote(noteId, { status: 'finalized' });
      setPendingNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Failed to finalize note:', error);
    } finally {
      setFinalizing(null);
    }
  };

  const handleViewNote = (noteId: number) => {
    router.push(`/notes/${noteId}`);
    onClose();
  };

  const handleFinalizeAll = async () => {
    for (const note of pendingNotes) {
      try {
        await apiClient.updateNote(note.id, { status: 'finalized' });
      } catch (error) {
        console.error(`Failed to finalize note ${note.id}:`, error);
      }
    }
    setPendingNotes([]);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
      case 'pending_review':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <ExclamationTriangleIcon className="w-6 h-6" />
            Finalize Notes Before Workday Ends
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-900/20 dark:border-orange-800">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <ClockIcon className="w-5 h-5" />
              <span className="font-medium">Your workday is ending soon!</span>
            </div>
            <p className="text-orange-700 dark:text-orange-300 mt-1">
              Please finalize all pending notes before leaving for the day.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading pending notes...</p>
            </div>
          ) : pendingNotes.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 dark:text-green-400 font-medium">
                Great! No pending notes to finalize.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Pending Notes ({pendingNotes.length})
                </h3>
                {pendingNotes.length > 0 && (
                  <Button 
                    onClick={handleFinalizeAll}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-900/20"
                  >
                    Finalize All
                  </Button>
                )}
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {pendingNotes.map((note) => (
                  <Card key={note.id} className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                            <h4 className="font-medium truncate">
                              {note.title || `Note #${note.id}`}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                              {note.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Created at {formatTime(note.created_at)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewNote(note.id)}
                          >
                            View
                          </Button>
                          <Button
                            onClick={() => handleFinalizeNote(note.id)}
                            disabled={finalizing === note.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {finalizing === note.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                                Finalize
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
