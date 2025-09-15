'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ClockIcon, 
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface WorkingHoursData {
  work_start_time: string;
  work_end_time: string;
  timezone: string;
  working_days: number[];
  is_workday: boolean;
  time_until_end: number | null;
  pending_notes_count: number;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' }
];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

export function WorkingHoursSettings() {
  const { user, loading: authLoading } = useAuth();
  const [workingHours, setWorkingHours] = useState<WorkingHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    work_start_time: '09:00',
    work_end_time: '17:00',
    timezone: 'UTC',
    working_days: [1, 2, 3, 4, 5] // Monday to Friday by default
  });

  useEffect(() => {
    // Only load working hours if user is authenticated and auth is not loading
    if (user && !authLoading) {
      loadWorkingHours();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadWorkingHours = async () => {
    // Don't load if user is not authenticated or auth is still loading
    if (!user || authLoading) {
      setLoading(false);
      return;
    }


    try {
      const data = await apiClient.getWorkingHours();
      setWorkingHours(data);
      setFormData({
        work_start_time: data.work_start_time,
        work_end_time: data.work_end_time,
        timezone: data.timezone,
        working_days: data.working_days
      });
    } catch (error: any) {
      console.error('Failed to load working hours:', error);
      // Don't show error if it's an authentication issue
      if (error?.message?.includes('credentials') || error?.message?.includes('401') || error?.message?.includes('Not Found') || error?.message?.includes('Authentication failed')) {
        setError(null);
      } else {
        setError('Failed to load working hours');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedData = await apiClient.updateWorkingHours(formData);
      setWorkingHours(updatedData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update working hours:', error);
      setError('Failed to update working hours');
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day].sort()
    }));
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading || authLoading || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            Working Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            {authLoading ? 'Loading...' : 'Please sign in to configure working hours'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5" />
          Working Hours
        </CardTitle>
        {workingHours && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {workingHours.is_workday ? (
              <span className="text-green-600 dark:text-green-400">
                Workday - {workingHours.time_until_end 
                  ? `${formatTimeRemaining(workingHours.time_until_end)} remaining`
                  : 'Workday ended'
                }
              </span>
            ) : (
              <span className="text-gray-500">Non-workday</span>
            )}
            {workingHours.pending_notes_count > 0 && (
              <span className="ml-2 text-orange-600 dark:text-orange-400">
                • {workingHours.pending_notes_count} pending notes today
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 flex items-center gap-2">
            <CheckIcon className="w-4 h-4" />
            Working hours updated successfully!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Start Time
            </label>
            <Input
              type="time"
              value={formData.work_start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, work_start_time: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              End Time
            </label>
            <Input
              type="time"
              value={formData.work_end_time}
              onChange={(e) => setFormData(prev => ({ ...prev, work_end_time: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            {COMMON_TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Working Days
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DAYS_OF_WEEK.map(day => (
              <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.working_days.includes(day.value)}
                  onChange={() => toggleWorkingDay(day.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
                Save Working Hours
              </>
            )}
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={loadWorkingHours}
            disabled={saving}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
