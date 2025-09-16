// Metrics utility functions for tracking user interactions and performance

export interface MetricEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export class MetricsTracker {
  private static instance: MetricsTracker;
  private events: MetricEvent[] = [];

  private constructor() {}

  public static getInstance(): MetricsTracker {
    if (!MetricsTracker.instance) {
      MetricsTracker.instance = new MetricsTracker();
    }
    return MetricsTracker.instance;
  }

  public track(event: MetricEvent): void {
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || new Date()
    };
    
    this.events.push(eventWithTimestamp);
    
    // In a real application, you would send this to your analytics service
    console.log('Metric tracked:', eventWithTimestamp);
  }

  public getEvents(): MetricEvent[] {
    return [...this.events];
  }

  public clearEvents(): void {
    this.events = [];
  }
}

// Convenience function for tracking metrics
export const trackMetric = (name: string, properties?: Record<string, any>) => {
  MetricsTracker.getInstance().track({ name, properties });
};

// Common metric names
export const METRIC_NAMES = {
  NOTE_CREATED: 'note_created',
  NOTE_EDITED: 'note_edited',
  NOTE_DELETED: 'note_deleted',
  PATIENT_CREATED: 'patient_created',
  PATIENT_EDITED: 'patient_edited',
  LOGIN: 'login',
  LOGOUT: 'logout',
  DASHBOARD_VIEWED: 'dashboard_viewed',
  SETTINGS_CHANGED: 'settings_changed',
  AUDIO_RECORDED: 'audio_recorded',
  AI_SUMMARY_GENERATED: 'ai_summary_generated',
} as const;

// Note session tracking
interface NoteSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  baselineMinutes: number;
}

// Local storage keys
const BASELINE_MINUTES_KEY = 'baseline_minutes';
const NOTE_SESSIONS_KEY = 'note_sessions';

// Baseline minutes management
export const getBaselineMinutes = (): number => {
  if (typeof window === 'undefined') return 15; // Default for SSR
  
  try {
    const stored = localStorage.getItem(BASELINE_MINUTES_KEY);
    return stored ? parseInt(stored, 10) : 15;
  } catch {
    return 15;
  }
};

export const setBaselineMinutes = (minutes: number): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(BASELINE_MINUTES_KEY, minutes.toString());
  } catch {
    // Silently fail if localStorage is not available
  }
};

// Note session management
export const getNoteSessions = (): NoteSession[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(NOTE_SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const recordNoteSession = (session: Omit<NoteSession, 'endTime' | 'duration'>): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const sessions = getNoteSessions();
    sessions.push({
      ...session,
      endTime: new Date(),
      duration: Date.now() - session.startTime.getTime()
    });
    
    // Keep only last 100 sessions to prevent storage bloat
    if (sessions.length > 100) {
      sessions.splice(0, sessions.length - 100);
    }
    
    localStorage.setItem(NOTE_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // Silently fail if localStorage is not available
  }
};