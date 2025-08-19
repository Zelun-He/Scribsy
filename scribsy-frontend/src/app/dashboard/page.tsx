'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { Note } from '@/types';

// SVG Icons as React components
const DocumentPlus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m3-3h-6" />
  </svg>
);

const FileText = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Clock = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BarChart3 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const TrendingUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const Heart = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ChevronLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface DashboardStats {
  totalNotes: number;
  recentNotes: Note[];
  timeSaved: number;
  patientEncounters: number;
  noteAccuracy: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalNotes: 0,
    recentNotes: [],
    timeSaved: 0,
    patientEncounters: 0,
    noteAccuracy: 0
  });
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [animatedStats, setAnimatedStats] = useState({
    totalNotes: 0,
    timeSaved: 0,
    patientEncounters: 0,
    noteAccuracy: 0
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      // Use router.push instead of window.location.href for better navigation
      router.push('/access-denied');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Only fetch data if user is authenticated
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const notes = await apiClient.getNotes();
        
        // Calculate active patients (patients with recent notes or pending status)
        const now = new Date();
        const twentyFourMonthsAgo = new Date(now.getTime() - 24 * 30 * 24 * 60 * 60 * 1000); // 24 months ago
        
        // Get patients with recent activity (last 24 months) or pending notes
        const activePatients = new Set();
        notes.forEach(note => {
          const noteDate = new Date(note.created_at);
          const isRecent = noteDate >= twentyFourMonthsAgo;
          const isPending = note.status === 'pending_review';
          
          if (isRecent || isPending) {
            activePatients.add(note.patient_id);
          }
        });
        
        const patientEncounters = activePatients.size;
        
        // Calculate time saved (assuming 15 minutes saved per note)
        const timeSaved = notes.length * 15;
        
        // Calculate note accuracy - percentage of completed/signed notes
        const completedNotes = notes.filter(note => 
          note.status === 'completed' || note.status === 'signed' || note.signed_at
        ).length;
        const noteAccuracy = notes.length > 0 ? Math.round((completedNotes / notes.length) * 100) : 0;
        
        setStats({
          totalNotes: notes.length,
          recentNotes: notes.slice(0, 3),
          timeSaved,
          patientEncounters,
          noteAccuracy
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // If there's an authentication error, don't continue trying to fetch data
        if (error instanceof Error && error.message.includes('401')) {
          console.log('User not authenticated, stopping data fetch');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Animate stats when they load
  useEffect(() => {
    if (!loading) {
      const animateValue = (start: number, end: number, duration: number, setter: (value: number) => void) => {
        const startTime = performance.now();
        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const currentValue = Math.floor(start + (end - start) * progress);
          setter(currentValue);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
      };

      animateValue(0, stats.totalNotes, 1500, (value) => 
        setAnimatedStats(prev => ({ ...prev, totalNotes: value }))
      );
      animateValue(0, stats.timeSaved, 2000, (value) => 
        setAnimatedStats(prev => ({ ...prev, timeSaved: value }))
      );
      animateValue(0, stats.patientEncounters, 1800, (value) => 
        setAnimatedStats(prev => ({ ...prev, patientEncounters: value }))
      );
      animateValue(0, stats.noteAccuracy, 1600, (value) => 
        setAnimatedStats(prev => ({ ...prev, noteAccuracy: value }))
      );
    }
  }, [loading, stats]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDate; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const notesOnDay = stats.recentNotes.filter(note => {
        const noteDate = new Date(note.created_at);
        return noteDate.toDateString() === date.toDateString();
      });
      
      days.push({
        day,
        date,
        notes: notesOnDay,
        isToday: date.toDateString() === new Date().toDateString()
      });
    }
    
    return days;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      consultation: 'bg-emerald-100 text-emerald-800',
      'follow-up': 'bg-amber-100 text-amber-800',
      physical: 'bg-blue-100 text-blue-800',
      urgent: 'bg-red-100 text-red-800',
      'post-op': 'bg-purple-100 text-purple-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Don't render dashboard if user is not authenticated
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--background)' }}>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="rounded-2xl p-8 text-white shadow-xl" style={{ background: 'var(--primary)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {user?.username || 'Dr. Smith'}!
                </h1>
                <p className="text-green-100 mb-6 text-lg">
                  Ready to create your next clinical note? Let&apos;s make a difference today.
                </p>
                <Link href="/notes/new">
                  <button className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-all transform hover:scale-105 shadow-lg flex items-center">
                    <DocumentPlus className="w-5 h-5 mr-2" />
                    Create New Note
                  </button>
                </Link>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-green-100 dark:text-purple-100" />
                  <p className="text-sm text-green-100 dark:text-purple-100">Caring for</p>
                  <p className="text-2xl font-bold">{loading ? '...' : animatedStats.patientEncounters}</p>
                  <p className="text-xs text-green-100 dark:text-purple-100">active patients</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-stone-200 dark:border-purple-700 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-stone-800 dark:text-purple-100 mb-1">
                {loading ? '...' : animatedStats.totalNotes}
              </div>
              <p className="text-stone-600 dark:text-purple-300 text-sm">Total Notes Generated</p>
              <div className="mt-2 text-xs text-green-600 dark:text-purple-400">Clinical documentation</div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-stone-200 dark:border-purple-700 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-stone-800 dark:text-purple-100 mb-1">
                {loading ? '...' : `${animatedStats.timeSaved}m`}
              </div>
              <p className="text-stone-600 dark:text-purple-300 text-sm">Time Saved</p>
              <div className="mt-2 text-xs text-green-600 dark:text-purple-400">Efficiency gained</div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-stone-200 dark:border-purple-700 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-amber-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-stone-800 dark:text-purple-100 mb-1">
                {loading ? '...' : animatedStats.patientEncounters}
              </div>
              <p className="text-stone-600 dark:text-purple-300 text-sm">Active Patients</p>
              <div className="mt-2 text-xs text-green-600 dark:text-purple-400">Currently under care (24 months)</div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-stone-200 dark:border-purple-700 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-stone-800 dark:text-purple-100 mb-1">
                {loading ? '...' : `${animatedStats.noteAccuracy}%`}
              </div>
              <p className="text-stone-600 dark:text-purple-300 text-sm">Note Accuracy Rate</p>
              <div className="mt-2 text-xs text-green-600 dark:text-purple-400">Completion & approval rate</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Interactive Calendar */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-stone-200 dark:border-purple-700 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-purple-900 dark:to-purple-800 p-6 border-b border-stone-200 dark:border-purple-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-stone-800 dark:text-purple-100 flex items-center">
                    <Calendar className="w-6 h-6 mr-2 text-emerald-600 dark:text-purple-400" />
                    Clinical Notes Calendar
                  </h2>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                      className="text-stone-600 dark:text-purple-300 hover:text-emerald-600 dark:hover:text-purple-100 transition-colors p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-purple-800"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-semibold text-stone-800 dark:text-purple-100">
                      {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    <button
                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                      className="text-stone-600 dark:text-purple-300 hover:text-emerald-600 dark:hover:text-purple-100 transition-colors p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-purple-800"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-stone-600 dark:text-purple-300 p-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`aspect-square p-2 rounded-lg transition-all cursor-pointer ${
                        day ? 'hover:bg-emerald-50 dark:hover:bg-purple-800' : ''
                      } ${
                        day?.isToday ? 'bg-emerald-100 dark:bg-purple-900 ring-2 ring-emerald-500 dark:ring-purple-500' : ''
                      }`}
                      onClick={() => day && day.notes && day.notes.length > 0 && setSelectedNote(day.notes[0])}
                    >
                      {day && (
                        <div className="h-full flex flex-col">
                          <span className={`text-sm font-medium ${
                            day.isToday ? 'text-emerald-700 dark:text-purple-100' : 'text-stone-700 dark:text-purple-200'
                          }`}>
                            {day.day}
                          </span>
                          {day.notes && day.notes.length > 0 && (
                            <div className="flex-1 mt-1">
                              {day.notes.slice(0, 2).map((note, idx) => (
                                <div
                                  key={idx}
                                  className="w-full h-1 bg-emerald-400 dark:bg-purple-400 rounded mb-1"
                                />
                              ))}
                              {day.notes.length > 2 && (
                                <div className="text-xs text-emerald-600 dark:text-purple-400 font-semibold">
                                  +{day.notes.length - 2}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Notes Sidebar */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-stone-200 dark:border-purple-700">
              <div className="bg-gradient-to-r from-stone-50 to-green-50 dark:from-purple-900 dark:to-purple-800 p-6 border-b border-stone-200 dark:border-purple-700">
                <h3 className="text-lg font-bold text-stone-800 dark:text-purple-100">Recent Notes</h3>
                <p className="text-stone-600 dark:text-purple-300 text-sm mt-1">Latest clinical documentation</p>
              </div>
              
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-purple-500"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.recentNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-4 border border-stone-200 dark:border-purple-600 rounded-lg hover:border-emerald-300 dark:hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedNote(note)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-stone-800 dark:text-purple-100 text-sm leading-tight">
                            {note.note_type || 'Clinical Note'}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(note.note_type || 'general')}`}>
                            {note.note_type || 'general'}
                          </span>
                        </div>
                        <p className="text-stone-600 dark:text-purple-300 text-xs mb-2 line-clamp-2">
                          {note.content.substring(0, 80)}...
                        </p>
                        <p className="text-stone-400 dark:text-purple-400 text-xs">
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Note Preview Modal */}
          {selectedNote && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b border-stone-200 dark:border-purple-700 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-purple-900 dark:to-purple-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-stone-800 dark:text-purple-100">{selectedNote.note_type || 'Clinical Note'}</h3>
                      <p className="text-stone-600 dark:text-purple-300 text-sm mt-1">{formatDate(selectedNote.created_at)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedNote(null)}
                      className="text-stone-400 dark:text-purple-400 hover:text-stone-600 dark:hover:text-purple-100 transition-colors p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-purple-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <span className={`text-xs px-3 py-1 rounded-full ${getCategoryColor(selectedNote.note_type || 'general')}`}>
                      {selectedNote.note_type || 'general'}
                    </span>
                  </div>
                  <div className="prose prose-stone dark:prose-invert text-stone-700 dark:text-purple-200">
                    {selectedNote.content}
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <Link href={`/notes/${selectedNote.id}`}>
                      <button className="px-4 py-2 bg-emerald-600 dark:bg-purple-600 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-purple-700 transition-colors">
                        Edit Note
                      </button>
                    </Link>
                    <button className="px-4 py-2 bg-stone-100 dark:bg-purple-800 text-stone-600 dark:text-purple-100 rounded-lg hover:bg-stone-200 dark:hover:bg-purple-700 transition-colors">
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}