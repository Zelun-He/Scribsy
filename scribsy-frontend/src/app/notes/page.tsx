'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DocumentPlusIcon, 
  DocumentTextIcon, 
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  FunnelIcon 
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { Note } from '@/types';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const fetchedNotes = await apiClient.getNotes();
      setNotes(fetchedNotes);
      setError('');
    } catch {
      setError('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortNotes = useCallback(() => {
    let filtered = notes;

    // Filter by search query
    if (searchQuery) {
      filtered = notes.filter(note =>
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort notes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredNotes(filtered);
  }, [notes, searchQuery, sortBy]);

  useEffect(() => {
    filterAndSortNotes();
  }, [filterAndSortNotes]);

  const deleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    setDeleteLoading(noteId.toString());
    try {
      await apiClient.deleteNote(noteId);
      setNotes(notes.filter(note => note.id !== noteId));
    } catch {
      setError('Failed to delete note');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Notes History
          </h1>
          <Link href="/notes/new">
            <Button>
              <DocumentPlusIcon className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Search and Filter */}
        <Card>
          <CardContent className="py-8 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">By Title</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes List */}
        {filteredNotes.length > 0 ? (
          <div className="grid gap-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Removed CardTitle for note.title */}
                      <CardDescription className="mt-1">
                        Created: {formatDate(note.created_at)}
                        {note.updated_at !== note.created_at && (
                          <span className="ml-2">
                            • Updated: {formatDate(note.updated_at)}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/notes/${note.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        disabled={deleteLoading === note.id.toString()}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleteLoading === note.id.toString() ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Content
                      </h4>
                      <p className="text-sm text-gray-600">
                        {truncateContent(note.content)}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Link href={`/notes/${note.id}`}>
                        <Button variant="ghost" size="sm">
                          <DocumentTextIcon className="w-4 h-4 mr-2" />
                          View Full Note
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery 
                  ? 'Try adjusting your search query or filters.' 
                  : 'Get started by creating your first clinical note.'
                }
              </p>
              <div className="mt-6">
                <Link href="/notes/new">
                  <Button>
                    <DocumentPlusIcon className="w-4 h-4 mr-2" />
                    Create Note
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}