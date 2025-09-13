'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface FinalizationWarning {
  should_warn: boolean;
  reason: string;
  minutes_remaining?: number;
  pending_notes_count?: number;
}

export function useFinalizationWarning() {
  const { user, loading: authLoading } = useAuth();
  const [warning, setWarning] = useState<FinalizationWarning | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const checkWarning = async () => {
    // Don't check if user is not authenticated or auth is still loading or component unmounted
    if (!user || authLoading || !isMountedRef.current) {
      setLoading(false);
      setWarning(null);
      return;
    }

    try {
      const warningData = await apiClient.getFinalizationWarning();
      if (isMountedRef.current) {
        setWarning(warningData.should_warn ? warningData : null);
      }
    } catch (error) {
      console.error('Failed to check finalization warning:', error);
      // Clear warning on any error (including auth failure)
      if (isMountedRef.current) {
        setWarning(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Don't start checking if user is not authenticated or auth is still loading
    if (!user || authLoading) {
      setLoading(false);
      setWarning(null);
      return;
    }

    // Check immediately
    checkWarning();

    // Check every 5 minutes
    intervalRef.current = setInterval(checkWarning, 5 * 60 * 1000);

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, authLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const dismissWarning = () => {
    setWarning(null);
  };

  return {
    warning,
    loading,
    dismissWarning,
    refreshWarning: checkWarning
  };
}
