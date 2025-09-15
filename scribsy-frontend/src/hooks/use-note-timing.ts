'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

export type CreationMethod = 'handwritten' | 'ai_assisted' | 'ai_generated' | 'voice_transcription';

export interface TimingSession {
  noteId: number;
  method: CreationMethod;
  baselineMinutes: number;
  startedAt: Date;
  completedAt?: Date;
  actualMinutes?: number;
  timeSavedMinutes?: number;
  efficiencyPercentage?: number;
}

export interface TimingStats {
  total_notes: number;
  date_range: {
    start: string;
    end: string;
    days: number;
  };
  methods: {
    [method: string]: {
      total_notes: number;
      total_baseline_minutes: number;
      total_actual_minutes: number;
      total_time_saved_minutes: number;
      avg_baseline_minutes: number;
      avg_actual_minutes: number;
      avg_time_saved_minutes: number;
      avg_efficiency_percentage: number;
    };
  };
}

export function useNoteTiming(noteId?: number) {
  const [currentSession, setCurrentSession] = useState<TimingSession | null>(null);
  const [isTiming, setIsTiming] = useState(false);
  const [timingStats, setTimingStats] = useState<TimingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default baseline times for each method
  const defaultBaselines: Record<CreationMethod, number> = {
    handwritten: 15,
    ai_assisted: 8,
    ai_generated: 3,
    voice_transcription: 5,
  };

  const startTiming = async (
    method: CreationMethod,
    customBaselineMinutes?: number
  ): Promise<void> => {
    if (!noteId) {
      setError('No note ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baselineMinutes = customBaselineMinutes ?? defaultBaselines[method];
      
      const response = await apiClient.startNoteTiming(noteId, method, baselineMinutes);
      
      const session: TimingSession = {
        noteId,
        method,
        baselineMinutes,
        startedAt: new Date(response.started_at),
      };

      setCurrentSession(session);
      setIsTiming(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timing');
    } finally {
      setLoading(false);
    }
  };

  const completeTiming = async (): Promise<void> => {
    if (!noteId || !currentSession) {
      setError('No active timing session');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.completeNoteTiming(noteId);
      
      const updatedSession: TimingSession = {
        ...currentSession,
        completedAt: new Date(response.completed_at),
        actualMinutes: response.actual_minutes,
        timeSavedMinutes: response.time_saved_minutes,
        efficiencyPercentage: response.efficiency_percentage,
      };

      setCurrentSession(updatedSession);
      setIsTiming(false);
      
      // Refresh stats after completing timing
      await fetchTimingStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete timing');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimingStats = async (method?: CreationMethod, days: number = 30): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const stats = await apiClient.getNoteTimingStats(method, days);
      setTimingStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timing stats');
    } finally {
      setLoading(false);
    }
  };

  const getTimeSavedComparison = (): {
    handwritten: number;
    ai_assisted: number;
    ai_generated: number;
    voice_transcription: number;
  } | null => {
    if (!timingStats) return null;

    const comparison = {
      handwritten: 0,
      ai_assisted: 0,
      ai_generated: 0,
      voice_transcription: 0,
    };

    Object.entries(timingStats.methods).forEach(([method, stats]) => {
      if (method in comparison) {
        comparison[method as CreationMethod] = stats.avg_time_saved_minutes;
      }
    });

    return comparison;
  };

  const getEfficiencyComparison = (): {
    handwritten: number;
    ai_assisted: number;
    ai_generated: number;
    voice_transcription: number;
  } | null => {
    if (!timingStats) return null;

    const comparison = {
      handwritten: 0,
      ai_assisted: 0,
      ai_generated: 0,
      voice_transcription: 0,
    };

    Object.entries(timingStats.methods).forEach(([method, stats]) => {
      if (method in comparison) {
        comparison[method as CreationMethod] = stats.avg_efficiency_percentage;
      }
    });

    return comparison;
  };

  // Auto-fetch stats on mount
  useEffect(() => {
    fetchTimingStats();
  }, []);

  return {
    currentSession,
    isTiming,
    timingStats,
    loading,
    error,
    startTiming,
    completeTiming,
    fetchTimingStats,
    getTimeSavedComparison,
    getEfficiencyComparison,
    defaultBaselines,
  };
}

// Hook for timing display component
export function useTimingDisplay(session: TimingSession | null) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session || session.completedAt) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Calculate initial elapsed time
    const now = Date.now();
    const started = session.startedAt.getTime();
    setElapsedSeconds(Math.floor((now - started) / 1000));

    // Update every second
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const started = session.startedAt.getTime();
      setElapsedSeconds(Math.floor((now - started) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (!session) return 0;
    
    const elapsedMinutes = elapsedSeconds / 60;
    const baselineMinutes = session.baselineMinutes;
    
    return Math.min(100, (elapsedMinutes / baselineMinutes) * 100);
  };

  const getTimeRemaining = (): string => {
    if (!session) return '0:00';
    
    const elapsedMinutes = elapsedSeconds / 60;
    const baselineMinutes = session.baselineMinutes;
    const remainingMinutes = Math.max(0, baselineMinutes - elapsedMinutes);
    
    const mins = Math.floor(remainingMinutes);
    const secs = Math.floor((remainingMinutes - mins) * 60);
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    progressPercentage: getProgressPercentage(),
    timeRemaining: getTimeRemaining(),
  };
}
