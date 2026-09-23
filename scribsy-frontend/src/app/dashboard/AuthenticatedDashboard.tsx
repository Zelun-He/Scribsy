'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { Note, Appointment, Patient } from '@/types';
import { useToast } from '@/lib/toast';
import { getNoteSessions, getBaselineMinutes } from '@/lib/metrics';
import { burstConfetti } from '@/lib/confetti';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FinalizationWarning } from '@/components/ui/finalization-warning';
import { useFinalizationWarning } from '@/hooks/use-finalization-warning';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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

const PencilSquare = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const VideoCamera = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Bell = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
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
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [patients, setPatients] = useState<{[key: number]: Patient}>({});
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  
  // Finalization warning
  const { warning, loading: warningLoading, dismissWarning } = useFinalizationWarning();
  const [showFinalizationDialog, setShowFinalizationDialog] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'week' | 'day'>('week');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [animatedStats, setAnimatedStats] = useState({
    totalNotes: 0,
    timeSaved: 0,
    patientEncounters: 0,
    noteAccuracy: 0
  });
  const [panelView, setPanelView] = useState<'appointments' | 'recent'>('appointments');
  const [kpiRanges, setKpiRanges] = useState<{notes: '7'|'14'|'all'; time: '7'|'14'|'all'; patients: '7'|'14'|'all'; accuracy: '7'|'14'|'all';}>({ notes: '7', time: '7', patients: '7', accuracy: '7' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeKpi, setActiveKpi] = useState<'notes' | 'time' | 'patients' | 'accuracy' | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { show } = useToast();

  const showAlertDialog = (title: string, description: string, onConfirm: () => void) => {
    setAlertDialogConfig({ title, description, onConfirm });
    setAlertDialogOpen(true);
  };
  const [kpiOrder, setKpiOrder] = useState<Array<'notes'|'time'|'patients'|'accuracy'>>(['notes','time','patients','accuracy']);
  const [dragApptId, setDragApptId] = useState<number | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerNotes, setDrawerNotes] = useState<Note[]>([]);
  const [drawerSpark, setDrawerSpark] = useState<number[]>([]);
  // Per-row delta map for patients drawer (patientId -> delta%)
  const [patientDeltaMap, setPatientDeltaMap] = useState<Record<number, number>>({});
  // Long-press state
  const [quickApptMenu, setQuickApptMenu] = useState<{ open: boolean; appt: Appointment | null; x: number; y: number }>({ open: false, appt: null, x: 0, y: 0 });
  const pressTimerRef = useRef<number | null>(null);
  const baselineMinutes = useMemo(() => getBaselineMinutes(), []);
  const sessions = useMemo(() => getNoteSessions(user?.id ?? null), [user]);
  const [checkingApptId, setCheckingApptId] = useState<number | null>(null);
  const [remindingApptId, setRemindingApptId] = useState<number | null>(null);
  const [reminded, setReminded] = useState<Record<number, number>>({});
  const drawerSparkMax = useMemo(() => (drawerSpark && drawerSpark.length ? Math.max(...drawerSpark) : 1), [drawerSpark]);
  const [kpiDelta, setKpiDelta] = useState<{notes:number; time:number; patients:number; accuracy:number}>({notes:0,time:0,patients:0,accuracy:0});
  // Reschedule confirmation modal state
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string>('09:00');
  // AI Copilot drawer state
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotTab, setCopilotTab] = useState<'summary'|'templates'|'checklists'|'insights'|'preferences'>('summary');
  const [aiPrefs, setAiPrefs] = useState<any>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogConfig, setAlertDialogConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ title: '', description: '', onConfirm: () => {} });
  // Rotating inspiration
  const inspirationMessages = useMemo(() => [
    "Ready to create your next clinical note? Let's make a difference today.",
    'Small steps, big impact. Your next note helps someone heal.',
    'Clarity saves time. Let\'s capture a great note together.',
    'Every patient story matters — document it with care.',
    'Precision today means better outcomes tomorrow. You\'ve got this.',
    'Thank you for what you do.',
  ], []);
  const [inspoMessage, setInspoMessage] = useState<string>(inspirationMessages[0]);
  const hasRotatedInspo = useRef(false);
  

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      // Use router.push instead of window.location.href for better navigation
      router.push('/access-denied');
    }
  }, [user, authLoading, router]);

  // Show finalization warning dialog when warning is detected
  useEffect(() => {
    if (warning && !showFinalizationDialog && user) {
      setShowFinalizationDialog(true);
    }
  }, [warning, showFinalizationDialog, user]);

  // Clear finalization dialog when user logs out
  useEffect(() => {
    if (!user) {
      setShowFinalizationDialog(false);
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Only fetch data if user is authenticated
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const notes = await apiClient.getNotes();
        setAllNotes(notes);
        
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
        
        // Calculate time saved from actual note timing data
        const timeSaved = notes.reduce((total, note) => {
          return total + (note.time_saved_minutes || 0);
        }, 0);
        
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
    const fetchUpcoming = async () => {
      if (!user) return;
      try {
        const appts = await apiClient.getUpcomingAppointments(168);
        setUpcoming(appts);
        
        // Fetch patient details for each appointment
        const patientIds = [...new Set(appts.map(appt => appt.patient_id))];
        const patientPromises = patientIds.map(id => 
          apiClient.getPatient(id).catch(e => {
            console.error(`Failed to fetch patient ${id}:`, e);
            return null;
          })
        );
        
        const patientResults = await Promise.all(patientPromises);
        const patientsMap: {[key: number]: Patient} = {};
        patientResults.forEach(patient => {
          if (patient) {
            patientsMap[patient.id] = patient;
          }
        });
        setPatients(patientsMap);
      } catch (e) {
        console.error('Failed to fetch upcoming appointments', e);
      } finally {
        setLoadingUpcoming(false);
      }
    };
    fetchUpcoming();
    // Rotate inspiration once per login/session (guard against React StrictMode double-effect)
    if (!user || hasRotatedInspo.current) return;
    hasRotatedInspo.current = true;
    try {
      const key = `inspoIndex:${user.id}`;
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      const prev = raw ? parseInt(raw, 10) : -1;
      const next = isNaN(prev) ? 0 : (prev + 1) % inspirationMessages.length;
      if (typeof window !== 'undefined') window.localStorage.setItem(key, String(next));
      setInspoMessage(inspirationMessages[next]);
    } catch {
      // Fallback to random if storage unavailable
      setInspoMessage(inspirationMessages[Math.floor(Math.random()*inspirationMessages.length)]);
    }
  }, [user, inspirationMessages]);

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

  // Celebrate milestones
  useEffect(() => {
    if (loading) return;
    try {
      if (stats.totalNotes === 1) { burstConfetti(); show('🎉 First note created!'); }
      if (stats.patientEncounters === 10) { burstConfetti(); show('🎉 10th patient added!'); }
      if (stats.noteAccuracy >= 95) { burstConfetti(); show('🎯 95% accuracy streak!'); }
    } catch {}
  }, [loading, stats, show]);

  // Load/save KPI order per user
  const storageKey = useMemo(() => `kpiOrder:${user?.id ?? 'anon'}`, [user]);
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setKpiOrder(parsed);
        }
      }
    } catch {}
  }, [storageKey]);
  const persistOrder = (order: Array<'notes'|'time'|'patients'|'accuracy'>) => {
    setKpiOrder(order);
    try { if (typeof window !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(order)); } catch {}
  };
  const handleReorder = (src: 'notes'|'time'|'patients'|'accuracy', dst: 'notes'|'time'|'patients'|'accuracy') => {
    if (src === dst) return;
    const next = kpiOrder.filter(k => k !== src);
    const idx = next.indexOf(dst);
    next.splice(idx, 0, src);
    persistOrder(next);
  };

  // KPI helpers
  const setCardRange = (card: 'notes'|'time'|'patients'|'accuracy', range: '7'|'14'|'all') => {
    setKpiRanges(prev => ({ ...prev, [card]: range }));
  };
  const getRangeDates = (range: '7'|'14'|'all') => {
    const now = new Date();
    if (range === 'all') {
      const from = new Date(1970, 0, 1);
      const to = now;
      // Use a default window for sparkline buckets when showing all-time
      const days = 30;
      // No meaningful prior period for all-time; set to epoch window as placeholder
      const prevTo = new Date(from.getTime());
      const prevFrom = new Date(from.getTime());
      return { from, to, prevFrom, prevTo, days };
    }
    const days = parseInt(range, 10);
    const to = now;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevTo = new Date(from.getTime());
    const prevFrom = new Date(prevTo.getTime() - days * 24 * 60 * 60 * 1000);
    return { from, to, prevFrom, prevTo, days };
  };

  const rangeLabel = (range: '7'|'14'|'all') => range === 'all' ? 'All time' : `Last ${range} days`;

  const calcAccuracy = (arr: Note[]) => {
    if (!arr.length) return 0;
    // Use the accuracy_score field if available, otherwise fall back to completion-based calculation
    const notesWithAccuracy = arr.filter(n => n.accuracy_score !== undefined && n.accuracy_score !== null);
    if (notesWithAccuracy.length > 0) {
      const totalAccuracy = notesWithAccuracy.reduce((sum, n) => sum + (n.accuracy_score || 0), 0);
      return Math.round(totalAccuracy / notesWithAccuracy.length);
    }
    // Fallback to completion-based calculation for notes without accuracy_score
    const done = arr.filter(n => n.status === 'completed' || n.status === 'signed' || !!n.signed_at).length;
    return Math.round((done / arr.length) * 100);
  };

  const buildSpark = (arr: Note[], days: number) => {
    const counts: number[] = Array.from({ length: days }).map(() => 0);
    const today = new Date();
    for (const n of arr) {
      const d = new Date(n.created_at);
      const diffDays = Math.floor((today.getTime() - d.getTime()) / (24*60*60*1000));
      if (diffDays >= 0 && diffDays < days) {
        counts[days - diffDays - 1] += 1;
      }
    }
    return counts;
  };

  // Per-card values based on independent ranges
  const inRange = (d: Date, from: Date, to: Date) => d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
  const notesCountForCard = useMemo(() => {
    const { from, to } = getRangeDates(kpiRanges.notes);
    return allNotes.filter(n => inRange(new Date(n.created_at), from, to)).length;
  }, [kpiRanges.notes, allNotes]);
  const timeSavedForCard = useMemo(() => {
    const { from, to } = getRangeDates(kpiRanges.time);
    const baselineMs = baselineMinutes * 60000;
    const minutes = sessions
      .filter(s => s && typeof s.startedAt === 'number' && typeof s.savedAt === 'number' && s.startedAt >= from.getTime() && s.startedAt <= to.getTime())
      .reduce((acc, s) => {
        const duration = Math.max(0, (s as any).durationMs ?? (s.savedAt - s.startedAt));
        const savedMs = Math.max(0, baselineMs - duration);
        return acc + Math.round(savedMs / 60000);
      }, 0);
    return minutes;
  }, [kpiRanges.time, sessions, baselineMinutes]);
  const patientsCountForCard = useMemo(() => {
    const { from, to } = getRangeDates(kpiRanges.patients);
    const ids = new Set(allNotes.filter(n => inRange(new Date(n.created_at), from, to)).map(n => n.patient_id));
    return ids.size;
  }, [kpiRanges.patients, allNotes]);
  const accuracyForCard = useMemo(() => {
    const { from, to } = getRangeDates(kpiRanges.accuracy);
    const arr = allNotes.filter(n => inRange(new Date(n.created_at), from, to));
    return calcAccuracy(arr);
  }, [kpiRanges.accuracy, allNotes]);

  // Time saved tooltip breakdown (recent sessions in range)
  const timeSavedRows = useMemo(() => {
    const { from, to } = getRangeDates(kpiRanges.time);
    const baselineMs = baselineMinutes * 60000;
    const rows = sessions
      .filter(s => s && typeof s.startedAt === 'number' && s.startedAt >= from.getTime() && s.startedAt <= to.getTime())
      .map(s => {
        const duration = Math.max(0, (s as any).durationMs ?? (s.savedAt - s.startedAt));
        const actualMin = Math.max(0, Math.round(duration / 60000));
        const savedMin = Math.max(0, Math.round((baselineMs - duration) / 60000));
        return { noteId: s.noteId, actualMin, savedMin, startedAt: s.startedAt };
      })
      .sort((a, b) => b.startedAt - a.startedAt);
    return rows;
  }, [kpiRanges.time, sessions, baselineMinutes]);
  const timeSavedTooltip = useMemo(() => {
    if (!timeSavedRows.length) return 'No measured sessions in range';
    const lines = timeSavedRows.slice(0, 6).map(r => `#${r.noteId}: +${r.savedMin}m (baseline ${baselineMinutes}m, actual ${r.actualMin}m)`);
    return `Time saved breakdown\n${lines.join('\n')}`;
  }, [timeSavedRows, baselineMinutes]);
  const timeSavedStats = useMemo(() => {
    const count = timeSavedRows.length;
    const totalActual = timeSavedRows.reduce((acc, r) => acc + r.actualMin, 0);
    const avgActual = count ? Math.round(totalActual / count) : 0;
    return { count, totalActual, avgActual };
  }, [timeSavedRows]);

  // Deltas for tooltips (per-card ranges)
  useEffect(() => {
    if (!user) return;
    if (kpiRanges.notes === 'all') { setKpiDelta(prev => ({ ...prev, notes: 0 })); return; }
    const { from, to, prevFrom, prevTo } = getRangeDates(kpiRanges.notes);
    const fetchBoth = async () => {
      try {
        const [currNotes, prevNotes] = await Promise.all([
          apiClient.getNotes({ limit: 1000, created_from: from.toISOString(), created_to: to.toISOString() }),
          apiClient.getNotes({ limit: 1000, created_from: prevFrom.toISOString(), created_to: prevTo.toISOString() }),
        ]);
        const del = (c: number, p: number) => {
          const base = p === 0 ? (c === 0 ? 1 : c) : p;
          return Math.round(((c - p) / base) * 100);
        };
        setKpiDelta(prevDelta => ({ ...prevDelta, notes: del(currNotes.length, prevNotes.length) }));
      } catch {}
    };
    fetchBoth();
  }, [kpiRanges.notes, user]);

  useEffect(() => {
    if (!user) return;
    if (kpiRanges.time === 'all') { setKpiDelta(prev => ({ ...prev, time: 0 })); return; }
    const { from, to, prevFrom, prevTo } = getRangeDates(kpiRanges.time);
    const fetchBoth = async () => {
      try {
        const [currNotes, prevNotes] = await Promise.all([
          apiClient.getNotes({ limit: 1000, created_from: from.toISOString(), created_to: to.toISOString() }),
          apiClient.getNotes({ limit: 1000, created_from: prevFrom.toISOString(), created_to: prevTo.toISOString() }),
        ]);
        const del = (c: number, p: number) => {
          const base = p === 0 ? (c === 0 ? 1 : c) : p;
          return Math.round(((c - p) / base) * 100);
        };
        setKpiDelta(prevDelta => ({ ...prevDelta, time: del(currNotes.length * 15, prevNotes.length * 15) }));
      } catch {}
    };
    fetchBoth();
  }, [kpiRanges.time, user]);

  useEffect(() => {
    if (!user) return;
    if (kpiRanges.patients === 'all') { setKpiDelta(prev => ({ ...prev, patients: 0 })); return; }
    const { from, to, prevFrom, prevTo } = getRangeDates(kpiRanges.patients);
    const fetchBoth = async () => {
      try {
        const [currNotes, prevNotes] = await Promise.all([
          apiClient.getNotes({ limit: 1000, created_from: from.toISOString(), created_to: to.toISOString() }),
          apiClient.getNotes({ limit: 1000, created_from: prevFrom.toISOString(), created_to: prevTo.toISOString() }),
        ]);
        const del = (c: number, p: number) => {
          const base = p === 0 ? (c === 0 ? 1 : c) : p;
          return Math.round(((c - p) / base) * 100);
        };
        const cCount = new Set(currNotes.map((n: Note) => n.patient_id)).size;
        const pCount = new Set(prevNotes.map((n: Note) => n.patient_id)).size;
        setKpiDelta(prevDelta => ({ ...prevDelta, patients: del(cCount, pCount) }));
      } catch {}
    };
    fetchBoth();
  }, [kpiRanges.patients, user]);

  useEffect(() => {
    if (!user) return;
    if (kpiRanges.accuracy === 'all') { setKpiDelta(prev => ({ ...prev, accuracy: 0 })); return; }
    const { from, to, prevFrom, prevTo } = getRangeDates(kpiRanges.accuracy);
    const fetchBoth = async () => {
      try {
        const [currNotes, prevNotes] = await Promise.all([
          apiClient.getNotes({ limit: 1000, created_from: from.toISOString(), created_to: to.toISOString() }),
          apiClient.getNotes({ limit: 1000, created_from: prevFrom.toISOString(), created_to: prevTo.toISOString() }),
        ]);
        const del = (c: number, p: number) => {
          const base = p === 0 ? (c === 0 ? 1 : c) : p;
          return Math.round(((c - p) / base) * 100);
        };
        setKpiDelta(prevDelta => ({ ...prevDelta, accuracy: del(calcAccuracy(currNotes), calcAccuracy(prevNotes)) }));
      } catch {}
    };
    fetchBoth();
  }, [kpiRanges.accuracy, user]);

  // Load drawer data
  useEffect(() => {
    if (!drawerOpen || !activeKpi || !user) return;
    const { from, to, prevFrom, prevTo, days } = getRangeDates(kpiRanges[activeKpi]);
    const load = async () => {
      setDrawerLoading(true);
      try {
        const curr = await apiClient.getNotes({ limit: 1000, created_from: from.toISOString(), created_to: to.toISOString() });
        setDrawerNotes(curr);
        setDrawerSpark(buildSpark(curr, days));

        // Compute per-patient deltas when viewing patients drawer
        if (activeKpi === 'patients' && kpiRanges.patients !== 'all') {
          const prev = await apiClient.getNotes({ limit: 1000, created_from: prevFrom.toISOString(), created_to: prevTo.toISOString() });
          const countByPatient = (arr: Note[]) => {
            const map: Record<number, number> = {};
            for (const n of arr) {
              const pid = (n.patient_id as unknown) as number;
              if (pid != null) map[pid] = (map[pid] || 0) + 1;
            }
            return map;
          };
          const currCounts = countByPatient(curr);
          const prevCounts = countByPatient(prev);
          const ids = new Set<number>([...Object.keys(currCounts), ...Object.keys(prevCounts)].map((x) => parseInt(x as string, 10)));
          const deltas: Record<number, number> = {};
          ids.forEach((id) => {
            const c = currCounts[id] || 0;
            const p = prevCounts[id] || 0;
            const base = p === 0 ? (c === 0 ? 1 : c) : p;
            deltas[id] = Math.round(((c - p) / base) * 100);
          });
          setPatientDeltaMap(deltas);
        } else if (activeKpi === 'patients' && kpiRanges.patients === 'all') {
          setPatientDeltaMap({});
        }
      } catch {
        setDrawerNotes([]);
        setDrawerSpark([]);
        if (activeKpi === 'patients') setPatientDeltaMap({});
      } finally {
        setDrawerLoading(false);
      }
    };
    load();
  }, [drawerOpen, activeKpi, kpiRanges, user]);

  // Appointment quick actions
  const startTelevisit = (appt: Appointment) => {
    const url = `https://meet.jit.si/Scribsy-Appt-${appt.id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    show('Televisit opened in a new tab');
  };
  const checkIn = async (appt: Appointment) => {
    setCheckingApptId(appt.id);
    try {
      const updated = await apiClient.checkInAppointment(appt.id);
      setUpcoming(prev => prev.map(a => a.id === appt.id ? updated : a));
      show('Checked in');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to check in';
      show(msg);
    } finally {
      setCheckingApptId(null);
    }
  };

  const remindIn10 = async (appt: Appointment) => {
    setRemindingApptId(appt.id);
    try {
      await apiClient.remindAppointment(appt.id, 10);
      setReminded(prev => ({ ...prev, [appt.id]: Date.now() }));
      show('Reminder set for 10 minutes');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to set reminder';
      show(msg);
    } finally {
      setRemindingApptId(null);
    }
  };

  // Command palette (Ctrl+K) to switch right panel view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(v => !v);
      }
      if ((e.shiftKey && (e.key === '?' || e.key === '/'))) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      if (e.key === 'Escape') setShortcutsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  const patientRows = useMemo(() => {
    if (activeKpi !== 'patients' || !drawerNotes || !drawerNotes.length) return [] as Array<{ patientId: number; count: number }>;
    const counts: Record<number, number> = {};
    for (const n of drawerNotes) {
      const pid = n.patient_id as unknown as number;
      if (pid != null) counts[pid] = (counts[pid] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([patientId, count]) => ({ patientId: parseInt(patientId, 10), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [activeKpi, drawerNotes]);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      consultation: 'bg-emerald-100 text-emerald-800',
      'follow-up': 'bg-amber-100 text-amber-800',
      physical: 'bg-blue-100 text-blue-800',
      urgent: 'bg-red-100 text-red-800',
      'post-op': 'bg-emerald-100 text-emerald-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const calendarDays = generateCalendarDays();
  // Drag-and-drop helpers for appointments
  const handleApptDragStart = (appt: Appointment, e: React.DragEvent) => {
    setDragApptId(appt.id);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.dropEffect = 'move';
    } catch {}
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'appt', id: appt.id }));
  };

  // Long-press helpers
  const openQuickMenu = (appt: Appointment, clientX: number, clientY: number) => {
    setQuickApptMenu({ open: true, appt, x: clientX, y: clientY });
  };
  const closeQuickMenu = () => setQuickApptMenu({ open: false, appt: null, x: 0, y: 0 });
  const onApptPressStart = (appt: Appointment, e: any) => {
    const t = e?.touches?.[0];
    const p = t ? { x: t.clientX, y: t.clientY } : { x: e.clientX || 0, y: e.clientY || 0 };
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => {
      openQuickMenu(appt, p.x, p.y);
    }, 550);
  };
  const onApptPressEnd = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleNewApptDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'new' }));
  };

  const dropOnDay = async (date: Date, e: React.DragEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      let payload: { type: 'appt' | 'new'; id?: number } | null = null;
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { payload = null; }
      // Prevent moving into the past day entirely
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);
      const targetDay = new Date(date);
      const targetDayStart = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate());
      if (targetDayStart.getTime() < startOfToday.getTime()) {
        show('Cannot reschedule to a past day');
        return;
      }
      if ((payload && payload.type === 'appt' && payload.id !== undefined) || dragApptId !== null) {
        // Open confirmation modal with time override option
        const targetId = (payload && payload.id !== undefined) ? payload.id : (dragApptId as number);
        const appt = upcoming.find(a => a.id === targetId);
        if (!appt) return;
        const old = new Date(appt.scheduled_at);
        const hh = String(old.getHours()).padStart(2, '0');
        const mm = String(old.getMinutes()).padStart(2, '0');
        setRescheduleAppt(appt);
        setRescheduleDate(new Date(date));
        setRescheduleTime(`${hh}:${mm}`);
        setRescheduleOpen(true);
      } else if (payload && payload.type === 'new') {
        const pidStr = window.prompt('Patient ID to schedule for:');
        if (!pidStr) return;
        const patientId = parseInt(pidStr, 10);
        if (Number.isNaN(patientId)) { show('Invalid patient ID'); return; }
        const title = window.prompt('Title (optional):') || 'Follow-up';
        const when = new Date(date);
        when.setHours(9, 0, 0, 0);
        const created = await apiClient.createAppointment({ patient_id: patientId, scheduled_at: when.toISOString(), title, note: '', notify_before_minutes: 30 });
        setUpcoming(prev => [created, ...prev]);
        show('Appointment created');
      }
    } catch (err) {
      console.error('Drop failed', err);
      const msg = err instanceof Error ? err.message : 'Failed to update appointment';
      show(msg);
    } finally {
      setDragApptId(null);
      setDragOverDate(null);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleAppt || !rescheduleDate) { setRescheduleOpen(false); return; }
    try {
      const [hhStr, mmStr] = rescheduleTime.split(':');
      const hh = Math.max(0, Math.min(23, parseInt(hhStr || '0', 10)));
      const mm = Math.max(0, Math.min(59, parseInt(mmStr || '0', 10)));
      const newDate = new Date(rescheduleDate);
      newDate.setHours(hh, mm, 0, 0);
      const now = new Date();
      if (newDate.toDateString() === now.toDateString() && newDate.getTime() <= now.getTime()) {
        const bumped = new Date(now.getTime() + 30 * 60 * 1000);
        newDate.setHours(bumped.getHours(), bumped.getMinutes(), 0, 0);
      }
      const updated = await apiClient.updateAppointment(rescheduleAppt.id, { scheduled_at: newDate.toISOString() });
      setUpcoming(prev => prev.map(a => a.id === rescheduleAppt.id ? updated : a));
      show('Appointment rescheduled');
      setRescheduleOpen(false);
      setRescheduleAppt(null);
      setRescheduleDate(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update appointment';
      show(msg);
    }
  };

  const handleCancelReschedule = () => {
    setRescheduleOpen(false);
    setRescheduleAppt(null);
    setRescheduleDate(null);
  };

  const formatDayLong = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  // Load AI prefs when opening copilot
  useEffect(() => {
    if (!copilotOpen || !user) return;
    const load = async () => {
      try { const p = await apiClient.getPreferences(); setAiPrefs(p); } catch {}
    };
    load();
  }, [copilotOpen, user]);

  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Don't render dashboard if user is not authenticated
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite" aria-label="Loading dashboard">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" aria-hidden="true"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
          {/* KPI Drawer */}
          {drawerOpen && (
            <div className="fixed inset-0 z-[80]">
              <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
              <div className="absolute right-0 top-0 h-full w-[420px] bg-white dark:bg-gray-900 shadow-2xl p-6 animate-slide-in overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-stone-800 dark:text-gray-100">{activeKpi === 'notes' ? 'Notes' : activeKpi === 'time' ? 'Time Saved' : activeKpi === 'patients' ? 'Active Patients' : 'Accuracy'}</h4>
                  <button className="text-stone-500 hover:text-stone-700" onClick={() => setDrawerOpen(false)}>Close</button>
                </div>
                <div className="mb-4 inline-flex items-center rounded-full border px-1 py-0.5 text-xs">
                  <button className={`px-2 py-0.5 rounded-full ${activeKpi && kpiRanges[activeKpi]==='7'?'bg-emerald-100 text-emerald-700':''}`} onClick={()=> activeKpi && setCardRange(activeKpi,'7')}>7d</button>
                  <button className={`px-2 py-0.5 rounded-full ${activeKpi && kpiRanges[activeKpi]==='14'?'bg-emerald-100 text-emerald-700':''}`} onClick={()=> activeKpi && setCardRange(activeKpi,'14')}>14d</button>
                  <button className={`px-2 py-0.5 rounded-full ${activeKpi && kpiRanges[activeKpi]==='all'?'bg-emerald-100 text-emerald-700':''}`} onClick={()=> activeKpi && setCardRange(activeKpi,'all')}>All</button>
                </div>
                {/* Sparkline */}
                <div className="h-16 flex items-end gap-1 mb-4">
                  {drawerSpark && drawerSpark.length > 0 ? (
                    drawerSpark.map((v, i) => {
                      const pct = Math.max(4, Math.round((v / (drawerSparkMax || 1)) * 100));
                      return <div key={i} className="w-2 flex-1 bg-emerald-100 dark:bg-gray-800 rounded" style={{ height: `${pct}%` }} />
                    })
                  ) : (
                    <div className="text-xs text-stone-500">No data</div>
                  )}
                </div>
                {/* Drilldown table */}
                <div className="border border-stone-200 dark:border-gray-800 rounded-md overflow-hidden">
                  <div className="grid grid-cols-3 text-xs font-medium bg-stone-50 dark:bg-[#1A1A1A] p-2 text-stone-600 dark:text-gray-300">
                    <div>Item</div>
                    <div className="text-center">Value</div>
                    <div className="text-right pr-2">Δ vs prior</div>
                  </div>
                  <div className="divide-y divide-stone-200 dark:divide-gray-800">
                    {activeKpi === 'patients' ? (
                      patientRows.length === 0 ? (
                        <div className="text-sm p-2 text-stone-500">No data</div>
                      ) : (
                        patientRows.map((row) => (
                          <div key={row.patientId} className="grid grid-cols-3 text-sm p-2">
                            <div>Patient #{row.patientId}</div>
                            <div className="text-center">{row.count} note{row.count !== 1 ? 's' : ''}</div>
                            <div className="text-right pr-2 text-emerald-600">
                              {kpiRanges.patients === 'all' ? '—' : ((patientDeltaMap[row.patientId] ?? 0) >= 0 ? `+${patientDeltaMap[row.patientId] ?? 0}%` : `${patientDeltaMap[row.patientId]}%`)}
                            </div>
                          </div>
                        ))
                      )
                    ) : activeKpi === 'time' ? (
                      timeSavedRows.length === 0 ? (
                        <div className="text-sm p-2 text-stone-500">No measured sessions in range</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 text-sm p-2 bg-stone-50 dark:bg-[#151515]">
                            <div>Total saved</div>
                            <div className="text-center font-medium">{Math.round(animatedStats.timeSaved)}m</div>
                            <div className="text-right pr-2 text-stone-500">{baselineMinutes}m baseline</div>
                          </div>
                          <div className="grid grid-cols-3 text-sm p-2 bg-stone-50 dark:bg-[#151515]">
                            <div>Avg actual</div>
                            <div className="text-center">{timeSavedStats.avgActual}m</div>
                            <div className="text-right pr-2 text-stone-500">{timeSavedStats.count} sessions</div>
                          </div>
                          {timeSavedRows.slice(0, 12).map((r, idx) => (
                            <div key={`${r.noteId}-${idx}`} className="grid grid-cols-3 text-sm p-2">
                              <div>Note #{r.noteId}</div>
                              <div className="text-center">+{r.savedMin}m saved</div>
                              <div className="text-right pr-2 text-stone-500">{r.actualMin}m actual</div>
                            </div>
                          ))}
                        </>
                      )
                    ) : (
                      (drawerNotes && drawerNotes.length > 0 ? drawerNotes.slice(0, 8) : []).map((n) => (
                        <div key={n.id} className="grid grid-cols-3 text-sm p-2">
                          <div>Note #{n.id}</div>
                          <div className="text-center">
                            {activeKpi === 'accuracy' ? (
                              (n.status === 'signed' || n.signed_at) ? 'Signed' : (n.status === 'completed' ? 'Completed' : 'Pending')
                            ) : (
                              formatDate(n.created_at)
                            )}
                          </div>
                          <div className="text-right pr-2 text-emerald-600">
                            {n.time_saved_minutes ? `+${n.time_saved_minutes}m` : '—'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="rounded-2xl p-8 text-white shadow-xl" style={{ background: 'var(--primary)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {user?.username || 'Dr. Smith'}!
                </h1>
                <p className="text-green-100 mb-6 text-lg">{inspoMessage}</p>
                <div className="flex items-center gap-3">
                  <Link href="/notes/new?from_action=true">
                    <button className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-all transform hover:scale-105 shadow-lg flex items-center">
                      <DocumentPlus className="w-5 h-5 mr-2" />
                      Create New Note
                    </button>
                  </Link>
                  <button 
                    onClick={()=>{ setCopilotOpen(true); setCopilotTab('summary'); }} 
                    className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-200 border border-white/20 hover:border-white/30"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-sm font-medium">AI Copilot</span>
                  </button>
                </div>
              </div>
              <div className={`hidden md:block`}> 
                {/* Patient Stats Card */}
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-green-100 dark:text-emerald-100" />
                  <p className="text-sm text-green-100 dark:text-emerald-100">Caring for</p>
                  <p className="text-2xl font-bold">{loading ? '...' : animatedStats.patientEncounters}</p>
                  <p className="text-xs text-green-100 dark:text-emerald-100">active patients</p>
                </div>

                {/* AI Controls - moved next to Create New Note */}
              </div>
            </div>

            {/* Mobile Controls */}
            <div className="md:hidden mt-6 flex flex-col sm:flex-row gap-4">
              {/* Mobile AI Copilot Button */}
              <button 
                onClick={()=>{ setCopilotOpen(true); setCopilotTab('summary'); }} 
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-200 border border-white/20 hover:border-white/30 flex-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="font-medium">AI Copilot</span>
              </button>
            </div>
          </div>

          {/* Interactive Stats - drag to reorder */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6" onDragOver={(e)=>e.preventDefault()}>
            {/* Notes Card */}
            <div
              draggable
              onDragStart={(e)=>{e.dataTransfer.setData('text/plain','notes')}}
              onDrop={(e)=>{const src=e.dataTransfer.getData('text/plain') as any; handleReorder(src,'notes');}}
              className="group bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-stone-200 dark:border-gray-800 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(16,185,129,0.45)] cursor-pointer"
              onClick={() => { setActiveKpi('notes'); setDrawerOpen(true); }}
              title="View all notes"
              style={{ order: kpiOrder.indexOf('notes') }}
            >
              <div className="mb-3 inline-flex items-center rounded-full border px-1 py-0.5 text-xs">
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.notes==='7'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('notes','7');}}>7d</button>
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.notes==='14'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('notes','14');}}>14d</button>
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.notes==='all'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('notes','all');}}>All</button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="bg-emerald-100 p-3 rounded-lg" title={`${kpiRanges.notes==='all' ? 'All-time' : `Δ ${kpiDelta.notes}% vs prior`}`}>
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-stone-800 dark:text-gray-100 mb-1">
                {loading ? '...' : notesCountForCard}
              </div>
              <p className="text-stone-600 dark:text-gray-300 text-sm">Total Notes Generated</p>
              <div className="mt-4 h-2 bg-stone-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, animatedStats.totalNotes || 0)}%` }} />
              </div>
              <div className="mt-2 text-xs text-green-600 dark:text-emerald-400">{rangeLabel(kpiRanges.notes)}</div>
            </div>

            {/* Time Card */}
            <div
              draggable
              onDragStart={(e)=>{e.dataTransfer.setData('text/plain','time')}}
              onDrop={(e)=>{const src=e.dataTransfer.getData('text/plain') as any; handleReorder(src,'time');}}
              className="group bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-stone-200 dark:border-gray-800 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(16,185,129,0.45)] cursor-pointer"
              onClick={() => { setActiveKpi('time'); setDrawerOpen(true); }}
              title="See per-note time saved"
              style={{ order: kpiOrder.indexOf('time') }}
            >
              <div className="mb-3 inline-flex items-center rounded-full border px-1 py-0.5 text-xs">
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.time==='7'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('time','7');}}>7d</button>
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.time==='14'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('time','14');}}>14d</button>
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.time==='all'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('time','all');}}>All</button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-lg" title={`${kpiRanges.time==='all' ? 'All-time' : `Δ ${kpiDelta.time}% vs prior`}`}>
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-stone-800 dark:text-gray-100 mb-1" title={timeSavedTooltip}>
                {loading ? '...' : `${Math.round(animatedStats.timeSaved)}m`}
              </div>
              <p className="text-stone-600 dark:text-gray-300 text-sm">Time Saved</p>
              <div className="mt-4 flex items-end gap-1 h-10">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className="w-2 flex-1 bg-emerald-100 dark:bg-gray-800 rounded" style={{ height: `${20 + (i * 4) % 30}%` }} />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-green-600 dark:text-emerald-400">{rangeLabel(kpiRanges.time)}</span>
                <button
                  className="text-emerald-700 dark:text-emerald-400 hover:underline"
                  onClick={(e)=>{ e.stopPropagation(); setActiveKpi('time'); setDrawerOpen(true); }}
                >
                  View details
                </button>
              </div>
            </div>

            {/* Patients Card */}
            <div
              draggable
              onDragStart={(e)=>{e.dataTransfer.setData('text/plain','patients')}}
              onDrop={(e)=>{const src=e.dataTransfer.getData('text/plain') as any; handleReorder(src,'patients');}}
              className="group bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-stone-200 dark:border-gray-800 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(16,185,129,0.45)] cursor-pointer"
              onClick={() => { setActiveKpi('patients'); setDrawerOpen(true); }}
              title="View active patients"
              style={{ order: kpiOrder.indexOf('patients') }}
            >
              <div className="mb-3 inline-flex items-center rounded-full border px-1 py-0.5 text-xs">
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.patients==='7'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('patients','7');}}>7d</button>
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.patients==='14'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('patients','14');}}>14d</button>
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.patients==='all'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('patients','all');}}>All</button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="bg-amber-100 p-3 rounded-lg" title={`${kpiRanges.patients==='all' ? 'All-time' : `Δ ${kpiDelta.patients}% vs prior`}`}>
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-stone-800 dark:text-gray-100 mb-1">
                {loading ? '...' : patientsCountForCard}
              </div>
              <p className="text-stone-600 dark:text-gray-300 text-sm">Active Patients</p>
              <div className="mt-4 h-2 bg-stone-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, animatedStats.patientEncounters || 0)}%` }} />
              </div>
              <div className="mt-2 text-xs text-green-600 dark:text-emerald-400">{rangeLabel(kpiRanges.patients)}</div>
            </div>

            {/* Accuracy Card */}
            <div
              draggable
              onDragStart={(e)=>{e.dataTransfer.setData('text/plain','accuracy')}}
              onDrop={(e)=>{const src=e.dataTransfer.getData('text/plain') as any; handleReorder(src,'accuracy');}}
              className="group bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-stone-200 dark:border-gray-800 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(16,185,129,0.45)] cursor-pointer"
              onClick={() => { setActiveKpi('accuracy'); setDrawerOpen(true); }}
              title="See accuracy details"
              style={{ order: kpiOrder.indexOf('accuracy') }}
            >
              <div className="mb-3 inline-flex items-center rounded-full border px-1 py-0.5 text-xs">
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.accuracy==='7'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('accuracy','7');}}>7d</button>
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.accuracy==='14'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('accuracy','14');}}>14d</button>
                <button className={`px-2 py-0.5 rounded-full ${kpiRanges.accuracy==='all'?'bg-emerald-100 text-emerald-700':''}`} onClick={(e)=>{e.stopPropagation();setCardRange('accuracy','all');}}>All</button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="bg-emerald-100 p-3 rounded-lg" title={`${kpiRanges.accuracy==='all' ? 'All-time' : `Δ ${kpiDelta.accuracy}% vs prior`}`}>
                  <BarChart3 className="w-6 h-6 text-emerald-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-stone-800 dark:text-gray-100 mb-1">
                {loading ? '...' : `${accuracyForCard}%`}
              </div>
              <p className="text-stone-600 dark:text-gray-300 text-sm">Note Accuracy Rate</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="relative h-10 w-10">
                  <svg viewBox="0 0 36 36" className="h-10 w-10">
                    <path className="text-stone-200 dark:text-gray-800" stroke="currentColor" strokeWidth="4" fill="none" d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32z" />
                    <path className="text-emerald-500" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"
                      strokeDasharray={`${accuracyForCard}, 100`} d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32z" />
                  </svg>
                </div>
                <div className="text-xs text-green-600 dark:text-emerald-400">{rangeLabel(kpiRanges.accuracy)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Interactive Calendar */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-stone-200 dark:border-gray-800 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(16,185,129,0.45)]">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-[#1A1A1A] dark:to-[#121212] h-[72px] px-6 border-b border-stone-200 dark:border-gray-800">
                <div className="flex items-center justify-between h-full">
                  <h2 className="text-xl font-bold text-stone-800 dark:text-gray-100 flex items-center">
                    <Calendar className="w-6 h-6 mr-2 text-emerald-600 dark:text-emerald-400" />
                    Clinical Notes Calendar
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="hidden sm:flex items-center border border-stone-200 dark:border-gray-800 rounded-full overflow-hidden text-xs">
                      <button
                        className={`px-3 py-1 ${calendarView==='week' ? 'bg-white dark:bg-gray-900 text-stone-800 dark:text-gray-100' : 'text-stone-600 dark:text-gray-300'}`}
                        onClick={()=>setCalendarView('week')}
                        aria-label="Week view"
                      >Week</button>
                      <button
                        className={`px-3 py-1 ${calendarView==='day' ? 'bg-white dark:bg-gray-900 text-stone-800 dark:text-gray-100' : 'text-stone-600 dark:text-gray-300'}`}
                        onClick={()=>setCalendarView('day')}
                        aria-label="Day view"
                      >Day</button>
                    </div>
                    <button
                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                      className="text-stone-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-gray-100 transition-colors p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-[#1A1A1A]"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-semibold text-stone-800 dark:text-gray-100">
                      {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    <button
                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                      className="text-stone-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-gray-100 transition-colors p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-[#1A1A1A]"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-stone-600 dark:text-gray-300 p-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`aspect-square p-2 rounded-lg transition-all cursor-pointer ${
                        day ? 'hover:bg-emerald-50 dark:hover:bg-[#1A1A1A]' : ''
                      } ${
                        day?.isToday ? 'bg-emerald-100 dark:bg-[#1A1A1A] ring-2 ring-emerald-500 dark:ring-emerald-500' : ''
                      }`}
                      onDragOver={(e)=>e.preventDefault()}
                      onDrop={(e)=> day && dropOnDay(day.date, e)}
                      onClick={() => { if (day) { setSelectedDate(day.date); setCalendarView('day'); } }}
                    >
                      {day && (
                        <div className="h-full flex flex-col">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${
                              day.isToday ? 'text-emerald-700 dark:text-emerald-300' : 'text-stone-700 dark:text-gray-300'
                            }`}>
                              {day.day}
                            </span>
                            <span className="text-[10px] text-stone-400" draggable onDragStart={handleNewApptDragStart} title="Drag to create">
                              +
                            </span>
                          </div>
                          {day.notes && day.notes.length > 0 && (
                            <div className="flex-1 mt-1">
                              {day.notes.slice(0, 2).map((note, idx) => (
                                <div key={idx} className="w-full h-1 bg-emerald-400 dark:bg-emerald-400 rounded mb-1" />
                              ))}
                              {day.notes.length > 2 && (
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
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

            {/* Right Panel: Day agenda or Appointments/Recent Notes */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-stone-200 dark:border-gray-800 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(16,185,129,0.45)]">
              <div className={`bg-stone-300 dark:bg-[#121212] h-[72px] px-3 sm:px-6 border-b border-stone-200 dark:border-gray-800 rounded-t-xl`}>
                <div className="flex items-center gap-2 sm:gap-4 h-full">
                  <h3 className={`flex-1 min-w-0 whitespace-nowrap truncate text-lg font-bold text-stone-800 dark:text-emerald-100`}>
                    {calendarView === 'day'
                      ? formatDayLong(selectedDate)
                      : (panelView === 'appointments' ? 'Appointments' : 'Recent Notes')}
                  </h3>
                  <div className="ml-auto shrink-0">
                    <button
                      className="inline-flex items-center justify-center gap-2 px-3 py-1.5 h-9 text-sm whitespace-nowrap bg-white dark:bg-gray-900 text-stone-800 dark:text-emerald-100 border border-stone-400 dark:border-gray-600 rounded-full shadow-sm ring-1 ring-stone-300 dark:ring-gray-700 hover:bg-emerald-50 dark:hover:bg-[#1A1A1A]"
                      onClick={() => setPanelView(panelView === 'appointments' ? 'recent' : 'appointments')}
                      aria-label="Toggle panel view"
                    >
                      {panelView === 'appointments' ? 'Recent Notes' : 'Appointments'}
                    </button>
                    
                  </div>
                </div>
              </div>

              <div className="p-6">
                {calendarView === 'day' ? (
                  panelView === 'appointments' ? (
                    <div>
                      {upcoming.filter(a => new Date(a.scheduled_at).toDateString() === selectedDate.toDateString()).length === 0 ? (
                        <div className="text-stone-500 dark:text-gray-400 text-sm">No appointments for this day</div>
                      ) : (
                        <div className="space-y-2">
                          {upcoming.filter(a => new Date(a.scheduled_at).toDateString() === selectedDate.toDateString()).map((appt) => (
                            <div key={appt.id} className="p-3 border border-stone-200 dark:border-gray-700 rounded-md flex items-center justify-between">
                              <div className="text-sm text-stone-700 dark:text-emerald-100">
                                {new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {appt.title || 'Appointment'}
                              </div>
                              <button className="text-xs px-2 py-1 rounded border" onClick={()=>window.location.href=`/notes/new?patient_id=${appt.patient_id}`}>Start Note</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {stats.recentNotes.filter(n => new Date(n.created_at).toDateString() === selectedDate.toDateString()).length === 0 ? (
                        <div className="text-stone-500 dark:text-gray-400 text-sm">No recent notes for this day</div>
                      ) : (
                        <div className="space-y-2">
                          {stats.recentNotes.filter(n => new Date(n.created_at).toDateString() === selectedDate.toDateString()).map((note) => (
                            <Link key={note.id} href={`/notes/${note.id}`} className="block p-3 border border-stone-200 dark:border-gray-700 rounded-md hover:border-emerald-300 dark:hover:border-emerald-400">
                              <div className="text-sm text-stone-700 dark:text-emerald-100">{note.note_type} · Visit #{note.visit_id}</div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ) : panelView === 'appointments' ? (
                  loadingUpcoming ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-500"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcoming.length === 0 ? (
                        <div className="text-center py-10">
                          <p className="text-stone-500 dark:text-gray-400 text-sm mb-4">No upcoming appointments</p>
                          <Link href="/appointments/new">
                            <button className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Schedule Appointment</button>
                          </Link>
                          <div className="mt-4">
                            <video className="mx-auto rounded-md shadow" width="280" height="158" autoPlay muted loop playsInline>
                              <source src="/demo/add-appointment.mp4" type="video/mp4" />
                            </video>
                          </div>
                        </div>
                      ) : (
                        upcoming.map((appt) => {
                          const patient = patients[appt.patient_id];
                          return (
                            <div
                              key={appt.id}
                              className="p-4 border border-stone-200 dark:border-gray-700 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-400 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                              draggable
                              onDragStart={(e)=>handleApptDragStart(appt, e)}
                              onMouseDown={(e)=>onApptPressStart(appt, e)}
                              onMouseUp={onApptPressEnd}
                              onMouseLeave={onApptPressEnd}
                              onTouchStart={(e)=>onApptPressStart(appt, e)}
                              onTouchEnd={onApptPressEnd}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-stone-800 dark:text-emerald-100 text-sm leading-tight">
                                    {appt.title || 'Appointment'}
                                  </h4>
                                  {patient && (
                                    <p className="text-stone-600 dark:text-emerald-300 text-xs mt-1">
                                      <Users className="w-3 h-3 inline mr-1" />
                                      {patient.first_name} {patient.last_name}
                                    </p>
                                  )}
                                  {!patient && (
                                    <p className="text-stone-400 dark:text-gray-500 text-xs mt-1">
                                      Patient #{appt.patient_id}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                                  {new Date(appt.scheduled_at).toLocaleString()}
                                </span>
                              </div>
                              {appt.note && (
                                <p className="text-stone-600 dark:text-emerald-300 text-xs mb-2 line-clamp-2">{appt.note}</p>
                              )}
                            <div className="space-y-2">
                              <div className="text-stone-400 dark:text-emerald-400 text-xs">
                                Notify {appt.notify_before_minutes} min before
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-200 dark:border-gray-600 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 transition-all duration-200 hover:shadow-sm" 
                                  title="Start Note" 
                                  onClick={(e)=>{e.preventDefault(); e.stopPropagation(); window.location.href=`/notes/new?patient_id=${appt.patient_id}`;}}
                                >
                                  <PencilSquare className="w-3.5 h-3.5" />
                                  Start Note
                                </button>
                                <button 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-200 dark:border-gray-600 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-all duration-200 hover:shadow-sm" 
                                  title="Start Televisit" 
                                  onClick={(e)=>{e.preventDefault(); e.stopPropagation(); startTelevisit(appt);}}
                                >
                                  <VideoCamera className="w-3.5 h-3.5" />
                                  Televisit
                                </button>
                                <button 
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 hover:shadow-sm ${appt.status==='checked_in' ? 'border-green-300 text-green-700 bg-green-50 dark:text-emerald-300 dark:bg-emerald-900/20' : 'border-stone-200 dark:border-gray-600 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-800/30'}`} 
                                  title="Check-in Patient" 
                                  onClick={(e)=>{e.preventDefault(); e.stopPropagation(); if(appt.status!=='checked_in') checkIn(appt);}}
                                  disabled={checkingApptId===appt.id || appt.status==='checked_in'}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  {checkingApptId===appt.id ? 'Checking…' : (appt.status==='checked_in' ? 'Checked in' : 'Check-in')}
                                </button>
                                <button 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-200 dark:border-gray-600 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-all duration-200 hover:shadow-sm" 
                                  title="Set 10 minute reminder" 
                                  onClick={(e)=>{e.preventDefault(); e.stopPropagation(); remindIn10(appt);}}
                                  disabled={remindingApptId===appt.id}
                                >
                                  <Bell className="w-3.5 h-3.5" />
                                  {remindingApptId===appt.id ? 'Scheduling…' : 'Remind 10m'}
                                </button>
                                {reminded[appt.id] && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">Reminder set</span>
                                )}
                              </div>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {stats.recentNotes.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-stone-500 dark:text-gray-400 text-sm mb-4">No recent notes</p>
                        <Link href="/notes/new">
                          <button className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Create Note</button>
                        </Link>
                        <div className="mt-4">
                          <video className="mx-auto rounded-md shadow" width="280" height="158" autoPlay muted loop playsInline>
                            <source src="/demo/create-note.mp4" type="video/mp4" />
                          </video>
                        </div>
                      </div>
                    ) : (
                      stats.recentNotes.map((note) => (
                        <Link key={note.id} href={`/notes/${note.id}`} className="block p-4 border border-stone-200 dark:border-gray-700 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-400 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-stone-800 dark:text-emerald-100 text-sm leading-tight">
                                {note.note_type} · Visit #{note.visit_id}
                              </div>
                              <div className="text-xs text-stone-600 dark:text-emerald-300 mt-1 line-clamp-2">
                                {note.content}
                              </div>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                              {new Date(note.created_at).toLocaleString()}
                            </span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reschedule Confirmation Modal */}
          {rescheduleOpen && rescheduleAppt && rescheduleDate && (
            <div className="fixed inset-0 z-[90]">
              <div className="absolute inset-0 bg-black/40" onClick={handleCancelReschedule} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-stone-200 dark:border-gray-800 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-gray-100">Confirm Reschedule</h3>
                  <button className="text-stone-500 hover:text-stone-700" onClick={handleCancelReschedule} aria-label="Close">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="text-sm text-stone-600 dark:text-gray-300">
                    Move <span className="font-medium">{rescheduleAppt.title || 'Appointment'}</span> to
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-[#1A1A1A] rounded-lg border border-stone-200 dark:border-gray-800">
                    <div className="text-stone-800 dark:text-gray-100 text-sm font-medium mb-2">{formatDayLong(rescheduleDate)}</div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Time</label>
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e)=>setRescheduleTime(e.target.value)}
                      className="w-full rounded-md border border-stone-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-stone-800 dark:text-gray-100 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button onClick={handleCancelReschedule} className="px-4 py-2 rounded-md border border-stone-200 dark:border-gray-700 text-stone-700 dark:text-gray-200 hover:bg-stone-50 dark:hover:bg-[#1A1A1A]">Cancel</button>
                  <button onClick={handleConfirmReschedule} className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Confirm</button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions Context Menu */}
          {quickApptMenu.open && quickApptMenu.appt && (
            <div className="fixed inset-0 z-[88]" onClick={()=>setQuickApptMenu({ open:false, appt:null, x:0, y:0 })}>
              <div
                className="absolute bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-stone-200 dark:border-gray-800 text-sm"
                style={{ left: Math.max(8, Math.min(window.innerWidth - 220, quickApptMenu.x - 110)), top: Math.max(8, Math.min(window.innerHeight - 160, quickApptMenu.y + 8)) }}
                onClick={(e)=>e.stopPropagation()}
              >
                <button className="block w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-[#1A1A1A]" onClick={()=>{ window.location.href=`/notes/new?patient_id=${quickApptMenu.appt!.patient_id}`; setQuickApptMenu({ open:false, appt:null, x:0, y:0 }); }}>Start Note</button>
                <button className="block w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-[#1A1A1A]" onClick={()=>{ startTelevisit(quickApptMenu.appt!); setQuickApptMenu({ open:false, appt:null, x:0, y:0 }); }}>Start Televisit</button>
                <button className="block w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-[#1A1A1A]" onClick={()=>{ checkIn(quickApptMenu.appt!); setQuickApptMenu({ open:false, appt:null, x:0, y:0 }); }}>Check-in</button>
                <button className="block w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-[#1A1A1A]" onClick={()=>{ remindIn10(quickApptMenu.appt!); setQuickApptMenu({ open:false, appt:null, x:0, y:0 }); }}>Remind in 10m</button>
              </div>
            </div>
          )}

          {/* AI Copilot Drawer */}
          {copilotOpen && (
            <div className="fixed inset-0 z-[85]">
              <div className="absolute inset-0 bg-black/40" onClick={() => setCopilotOpen(false)} />
              <div className="absolute right-0 top-0 h-full w-[420px] bg-white dark:bg-gray-900 shadow-2xl border-l border-stone-200 dark:border-gray-800 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-stone-800 dark:text-gray-100">AI Copilot</h4>
                  <button className="text-stone-500 hover:text-stone-700" onClick={() => setCopilotOpen(false)} aria-label="Close">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-4 inline-flex items-center rounded-full border border-stone-200 dark:border-gray-800 px-1 py-0.5 text-xs">
                  <button className={`px-3 py-1 rounded-full ${copilotTab==='summary'?'bg-emerald-100 text-emerald-700':''}`} onClick={()=>setCopilotTab('summary')}>Summary</button>
                  <button className={`px-3 py-1 rounded-full ${copilotTab==='templates'?'bg-emerald-100 text-emerald-700':''}`} onClick={()=>setCopilotTab('templates')}>Templates</button>
                  <button className={`px-3 py-1 rounded-full ${copilotTab==='checklists'?'bg-emerald-100 text-emerald-700':''}`} onClick={()=>setCopilotTab('checklists')}>ROS</button>
                  <button className={`px-3 py-1 rounded-full ${copilotTab==='insights'?'bg-emerald-100 text-emerald-700':''}`} onClick={()=>setCopilotTab('insights')}>Insights</button>
                </div>

                {copilotTab === 'summary' && (
                  <div className="space-y-3">
                    <div className="text-sm text-stone-600 dark:text-gray-300">Recent activity summary</div>
                    <div className="p-3 rounded-lg border border-stone-200 dark:border-gray-800 bg-stone-50 dark:bg-[#1A1A1A] text-sm text-stone-800 dark:text-gray-100">
                      {allNotes.length === 0 ? 'No recent notes to summarize.' : `You have ${allNotes.length} notes in the selected periods. Accuracy is approximately ${accuracyForCard}%.`}
                    </div>
                  </div>
                )}

                {copilotTab === 'templates' && (
                  <div className="space-y-3">
                    <div className="text-sm text-stone-600 dark:text-gray-300">Suggested SOAP template</div>
                    <textarea id="template-editor" className="w-full h-40 rounded-lg border border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-stone-800 dark:text-gray-100 p-3" defaultValue={`Subjective:\n- Chief complaint:\n- HPI:\n\nObjective:\n- Vitals:\n- Exam:\n\nAssessment:\n- \n\nPlan:\n- \n`} />
                    <div className="flex items-center gap-3">
                      <button className="px-3 py-2 rounded-md border border-stone-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-[#1A1A1A] text-sm" onClick={()=>{
                        const ta = document.getElementById('template-editor') as HTMLTextAreaElement | null;
                        if (!ta) return;
                        navigator.clipboard?.writeText(ta.value).catch(()=>{});
                        show('Template copied');
                      }}>Copy</button>
                      <button className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-sm" onClick={async ()=>{
                        const ta = document.getElementById('template-editor') as HTMLTextAreaElement | null;
                        if (!ta) return;
                        const confirmApply = window.confirm('Apply this template as your default AI formatting preferences?');
                        if (!confirmApply) return;
                        // Heuristic mapping: if user kept SOAP headings, keep soap; else narrative/bulleted
                        const text = ta.value.toLowerCase();
                        const isSoap = text.includes('subjective:') && text.includes('objective:') && text.includes('assessment:') && text.includes('plan:');
                        const isBulleted = /^- |\n- /m.test(ta.value);
                        const prefs: any = { format: isSoap ? 'soap' : (isBulleted ? 'bulleted' : 'narrative'), template_text: ta.value };
                        try { const p = await apiClient.updatePreferences(prefs); setAiPrefs(p); show('Preferences updated'); } catch { show('Failed to save'); }
                      }}>Apply as default</button>
                    </div>
                  </div>
                )}

                {copilotTab === 'checklists' && (
                  <div className="space-y-4">
                    <div>
                      <div className="font-medium text-stone-800 dark:text-gray-100 mb-2">ROS</div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-stone-700 dark:text-gray-200">
                        {['General','HEENT','CV','Respiratory','GI','GU','MSK','Neuro','Skin','Psych'].map(item => (
                          <label key={item} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="rounded border-stone-300 dark:border-gray-700"
                              checked={Array.isArray(aiPrefs?.ros_sections) ? aiPrefs.ros_sections.includes(item) : false}
                              onChange={async (e)=>{
                                if (e.target.checked) {
                                  showAlertDialog(
                                    'Confirm ROS Setting',
                                    `Are you sure you want to enable ${item} in the Review of Systems?`,
                                    async () => {
                                      const next = new Set(aiPrefs?.ros_sections || []);
                                      next.add(item);
                                      const updated = { ...(aiPrefs||{}), ros_sections: Array.from(next) };
                                      setAiPrefs(updated);
                                      try { await apiClient.updatePreferences({ ros_sections: Array.from(next) }); show('Saved'); } catch { show('Failed to save'); }
                                    }
                                  );
                                  return;
                                }
                                const next = new Set(aiPrefs?.ros_sections || []);
                                next.delete(item);
                                const updated = { ...(aiPrefs||{}), ros_sections: Array.from(next) };
                                setAiPrefs(updated);
                                try { await apiClient.updatePreferences({ ros_sections: Array.from(next) }); show('Saved'); } catch { show('Failed to save'); }
                              }}
                            /> {item}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {copilotTab === 'insights' && (
                  <div className="space-y-3">
                    <div className="text-sm text-stone-600 dark:text-gray-300">Trends & deltas</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border border-stone-200 dark:border-gray-800">
                        <div className="text-xs text-stone-500 dark:text-gray-400">Notes</div>
                        <div className="text-lg font-semibold text-stone-800 dark:text-gray-100">{notesCountForCard}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-stone-200 dark:border-gray-800">
                        <div className="text-xs text-stone-500 dark:text-gray-400">Patients</div>
                        <div className="text-lg font-semibold text-stone-800 dark:text-gray-100">{patientsCountForCard}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-stone-200 dark:border-gray-800">
                        <div className="text-xs text-stone-500 dark:text-gray-400">Accuracy</div>
                        <div className="text-lg font-semibold text-stone-800 dark:text-gray-100">{accuracyForCard}%</div>
                      </div>
                      <div className="p-3 rounded-lg border border-stone-200 dark:border-gray-800">
                        <div className="text-xs text-stone-500 dark:text-gray-400">Time saved</div>
                        <div className="text-lg font-semibold text-stone-800 dark:text-gray-100">{Math.round(animatedStats.timeSaved)}m</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Overlay */}
          {shortcutsOpen && (
            <div className="fixed inset-0 z-[96] flex items-start justify-center pt-24" onClick={()=>setShortcutsOpen(false)}>
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-xl shadow-2xl border border-stone-200 dark:border-gray-800 overflow-hidden" onClick={(e)=>e.stopPropagation()}>
                <div className="p-4 border-b border-stone-200 dark:border-gray-800 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-stone-800 dark:text-gray-100">Keyboard Shortcuts</h4>
                  <button className="text-stone-500 hover:text-stone-700" onClick={()=>setShortcutsOpen(false)} aria-label="Close">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between"><span>Open Command Palette</span><kbd className="px-2 py-1 bg-stone-100 dark:bg-[#1A1A1A] rounded">Ctrl / ⌘ + K</kbd></div>
                  <div className="flex items-center justify-between"><span>Shortcuts Overlay</span><kbd className="px-2 py-1 bg-stone-100 dark:bg-[#1A1A1A] rounded">Shift + /</kbd></div>
                  <div className="flex items-center justify-between"><span>Toggle Right Panel</span><kbd className="px-2 py-1 bg-stone-100 dark:bg-[#1A1A1A] rounded">T</kbd></div>
                  <div className="flex items-center justify-between"><span>New Note</span><kbd className="px-2 py-1 bg-stone-100 dark:bg-[#1A1A1A] rounded">N</kbd></div>
                </div>
              </div>
            </div>
          )}

          {/* Note Preview Modal */}
          {selectedNote && (
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b border-stone-200 dark:border-gray-800 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-[#1A1A1A] dark:to-[#121212]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-stone-800 dark:text-emerald-100">{selectedNote.note_type || 'Clinical Note'}</h3>
                      <p className="text-stone-600 dark:text-emerald-300 text-sm mt-1">{formatDate(selectedNote.created_at)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedNote(null)}
                      className="text-stone-400 dark:text-emerald-400 hover:text-stone-600 dark:hover:text-emerald-100 transition-colors p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-[#1A1A1A]"
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
                  <div className="prose prose-stone dark:prose-invert text-stone-700 dark:text-emerald-200">
                    {selectedNote.content}
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <Link href={`/notes/${selectedNote.id}`}>
                      <button className="px-4 py-2 bg-emerald-600 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-colors">
                        Edit Note
                      </button>
                    </Link>
                    <button className="px-4 py-2 bg-stone-100 dark:bg-[#1A1A1A] text-stone-600 dark:text-emerald-100 rounded-lg hover:bg-stone-200 dark:hover:bg-[#222] transition-colors">
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert Dialog for AI Copilot Confirmations */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialogConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialogConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              alertDialogConfig.onConfirm();
              setAlertDialogOpen(false);
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finalization Warning Dialog */}
      <FinalizationWarning 
        isOpen={showFinalizationDialog}
        onClose={() => setShowFinalizationDialog(false)}
      />
    </>
  );
}