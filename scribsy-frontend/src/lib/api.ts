import { 
  LoginRequest, 
  RegisterRequest, 
  LoginResponse, 
  User, 
  Patient,
  Note, 
  Appointment,
  CreateNoteRequest, 
  TranscriptionResult,
  ApiError 
} from '@/types';

// Default to backend dev port 8000 unless overridden. When running on localhost, prefer Next proxy /api
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? '/api' : 'http://127.0.0.1:8000');

class ApiClient {
  private baseURL: string;
  private token: string | null = null; // kept for backward compatibility
  private authFailureCallback: (() => void) | null = null;
  private useCookies: boolean = true;
  private isLocalDev: boolean = false;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      const host = window.location.hostname;
      // Treat localhost and private LAN IPs as local dev
      const isPrivateLan = /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
      this.isLocalDev = host === 'localhost' || host === '127.0.0.1' || isPrivateLan;
      // Use cookies by default; header remains as fallback
      this.useCookies = true;
      // In local dev, prefer Next.js proxy to avoid CORS entirely, regardless of env value
      if (this.isLocalDev) {
        this.baseURL = '/api';
      }
    }
  }

  // Centralized fetch with one-time refresh on 401
  private async doFetch(url: string, init: RequestInit): Promise<Response> {
    const first = await fetch(url, init);
    if (first.status !== 401) return first;
    // Try sliding refresh once
    try {
      const refresh = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      if (refresh.ok) {
        try {
          const text = await refresh.text();
          const data = JSON.parse(text);
          if (data?.access_token) this.setToken(data.access_token);
        } catch {}
        // Retry original
        return await fetch(url, init);
      }
    } catch {}
    // Fallthrough: return original 401
    return first;
  }

  setAuthFailureCallback(callback: () => void) {
    this.authFailureCallback = callback;
  }

  private refreshTokenFromStorage() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private getHeaders(includeAuth: boolean = true): HeadersInit {
    // Send Authorization header when token is available (fallback if cookies fail)
    this.refreshTokenFromStorage();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (includeAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  private getJsonHeaders(): HeadersInit {
    return { 'Content-Type': 'application/json' };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Read body text once; attempt to surface detail string if present
      let bodyText = '';
      try { bodyText = await response.text(); } catch { bodyText = ''; }

      let parsedMsg = '';
      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText);
          if (parsed && typeof parsed === 'object') {
            parsedMsg = (parsed.detail || parsed.message || parsed.error || '').toString().trim();
          }
        } catch {
          parsedMsg = bodyText.substring(0, 300);
        }
      }

      if (response.status === 401) {
        this.clearToken();
        if (this.authFailureCallback) this.authFailureCallback();
        throw new Error(parsedMsg || 'Authentication failed');
      }

      // No body or no parsable message
      throw new Error(parsedMsg || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    try {
      // Try to parse as JSON first
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response received');
      }
      
      try {
        return JSON.parse(text);
      } catch (_parseError) {
        throw new Error(`Failed to parse JSON response: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to parse response');
      }
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const form = new URLSearchParams();
    form.append('username', credentials.username);
    form.append('password', credentials.password);

    // In local dev (via Next.js proxy), prefer cookie-based flow
    if (this.isLocalDev) {
      const respCookie = await fetch(`${this.baseURL}/auth/token-cookie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        credentials: 'include',
      });
      const result = await this.handleResponse<LoginResponse>(respCookie);
      this.setToken(result.access_token);
      this.useCookies = true;
      return result;
    }

    // In non-local, try cookie-based flow first
    try {
      const respCookie = await fetch(`${this.baseURL}/auth/token-cookie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        credentials: 'include',
      });
      const result = await this.handleResponse<LoginResponse>(respCookie);
      // Keep cookie-based flow only when not in local dev
      if (!this.isLocalDev) {
        this.useCookies = true;
      }
      // also keep token for auth header fallback
      this.setToken(result.access_token);
      return result;
    } catch (_err) {
      // Fallback: token-based (no credentials)
      const respToken = await fetch(`${this.baseURL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const result = await this.handleResponse<LoginResponse>(respToken);
      this.setToken(result.access_token);
      this.useCookies = false;
      return result;
    }
  }

  async register(userData: RegisterRequest): Promise<User> {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: this.getJsonHeaders(),
      body: JSON.stringify(userData),
      credentials: 'include',
    });

    return this.handleResponse<User>(response);
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<User>(response);
  }

  async refreshSession(): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    const result = await this.handleResponse<LoginResponse>(response);
    // keep header token fallback updated
    this.setToken(result.access_token);
    return result;
  }

  // Notes endpoints
  async getNotes(params?: {
    skip?: number;
    limit?: number;
    patient_id?: number;
    visit_id?: number;
    note_type?: string;
    status?: string;
    created_from?: string;
    created_to?: string;
  }): Promise<Note[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, value.toString());
        }
      });
    }

    // Avoid double slashes in proxy path
    const notesUrl = `${this.baseURL}/notes${query.toString() ? `/?${query.toString()}` : '/'}`;
    const response = await this.doFetch(notesUrl, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<Note[]>(response);
  }

  async getNote(id: number): Promise<Note> {
    this.refreshTokenFromStorage();
    const url = `${this.baseURL}/notes/${id}`;

    // Try cookie-only first (most stable locally), then both, then header-only.
    const attempts: Array<RequestInit> = [
      { credentials: 'include' },
      { credentials: 'include', headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined },
      { credentials: 'omit', headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined },
    ];

    let lastResponse: Response | null = null;
    for (const opts of attempts) {
      try {
        const resp = await fetch(url, opts);
        lastResponse = resp;
        if (resp.ok) {
          // parse as JSON text for consistency with handleResponse
          const text = await resp.text();
          if (!text) throw new Error('Empty response received');
          try {
            return JSON.parse(text);
          } catch {
            throw new Error(`Failed to parse JSON response: ${text.substring(0, 200)}...`);
          }
        }
        // On auth errors, try next attempt without triggering global auth failure yet
        if (resp.status === 401 || resp.status === 403) {
          continue;
        }
        // For any other error, construct a readable error without global auth failure
        const errorText = await resp.text();
        let detail = `HTTP ${resp.status}: ${resp.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed && parsed.detail) detail = parsed.detail;
        } catch {}
        throw new Error(detail);
      } catch (_err) {
        // Network/parse error; continue to next attempt
        continue;
      }
    }

    // If we're here, all attempts failed; use the last response for a consistent error
    if (lastResponse) {
      let detail = `HTTP ${lastResponse.status}: ${lastResponse.statusText}`;
      try {
        const txt = await lastResponse.text();
        const parsed = JSON.parse(txt);
        if (parsed && parsed.detail) detail = parsed.detail;
      } catch {}
      throw new Error(detail);
    }
    throw new Error('Failed to fetch note');
  }

  async createNote(noteData: CreateNoteRequest): Promise<Note> {
    const formData = new FormData();
    
    formData.append('patient_id', noteData.patient_id.toString());
    formData.append('provider_id', noteData.provider_id.toString());
    if (noteData.visit_id) {
      formData.append('visit_id', noteData.visit_id.toString());
    }
    formData.append('note_type', noteData.note_type);
    formData.append('content', noteData.content);
    formData.append('status', noteData.status);
    
    if (noteData.signed_at) {
      formData.append('signed_at', noteData.signed_at);
    }
    
    if (noteData.audio_file) {
      formData.append('audio_file', noteData.audio_file);
    }
    
    if (noteData.auto_transcribe !== undefined) {
      formData.append('auto_transcribe', noteData.auto_transcribe.toString());
    }
    
    if (noteData.auto_summarize !== undefined) {
      formData.append('auto_summarize', noteData.auto_summarize.toString());
    }

    const response = await fetch(`${this.baseURL}/notes/`, {
      method: 'POST',
      headers: { Authorization: this.token ? `Bearer ${this.token}` : '' },
      body: formData,
      credentials: 'include',
    });

    return this.handleResponse<Note>(response);
  }

  async updateNote(id: number, noteData: Partial<CreateNoteRequest>): Promise<Note> {
    const response = await fetch(`${this.baseURL}/notes/${id}`, {
      method: 'PUT',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify(noteData),
      credentials: 'include',
    });

    return this.handleResponse<Note>(response);
  }

  async deleteNote(id: number): Promise<{ ok: boolean }> {
    const response = await fetch(`${this.baseURL}/notes/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<{ ok: boolean }>(response);
  }

  // Transcription endpoint
  async transcribeAudio(
    file: File, 
    summarize: boolean = false
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    params.append('summarize', summarize.toString());

    const response = await fetch(`${this.baseURL}/transcribe?${params}`, {
      method: 'POST',
      headers: { Authorization: this.token ? `Bearer ${this.token}` : '' },
      body: formData,
      credentials: this.isLocalDev ? 'omit' : 'include',
    });

    try {
      const result = await this.handleResponse<TranscriptionResult>(response);
      console.log('Transcription result:', result);
      return result;
    } catch (error) {
      console.error('Transcription error in API client:', error);
      throw error;
    }
  }

  // Patient endpoints
  async getPatients(search?: string): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }

    const url = `${this.baseURL}/patients${params.toString() ? `/?${params.toString()}` : '/'}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<Patient[]>(response);
  }

  async getPatient(id: number): Promise<Patient> {
    const response = await fetch(`${this.baseURL}/patients/${id}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<Patient>(response);
  }

  async createPatient(patientData: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone_number?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  }): Promise<Patient> {
    const response = await fetch(`${this.baseURL}/patients/`, {
      method: 'POST',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify(patientData),
      credentials: 'include',
    });

    return this.handleResponse<Patient>(response);
  }

  async updatePatient(id: number, patientData: Partial<{
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone_number: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
  }>): Promise<Patient> {
    console.log(`API Client: Updating patient ${id} with data:`, patientData);
    
    const response = await fetch(`${this.baseURL}/patients/${id}`, {
      method: 'PUT',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify(patientData),
      credentials: 'include',
    });

    console.log(`API Client: Update response status:`, response.status);
    
    const result = await this.handleResponse<Patient>(response);
    console.log(`API Client: Update result:`, result);
    
    return result;
  }

  async deletePatient(id: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/patients/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async searchPatients(firstName?: string, lastName?: string): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (firstName) {
      params.append('first_name', firstName);
    }
    if (lastName) {
      params.append('last_name', lastName);
    }

    const response = await fetch(`${this.baseURL}/patients/search/?${params}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<Patient[]>(response);
  }

  async logoutServer(): Promise<void> {
    await fetch(`${this.baseURL}/auth/logout`, { method: 'POST', credentials: 'include' });
  }

  // Appointments
  async getPatientAppointments(patientId: number): Promise<Appointment[]> {
    const response = await fetch(`${this.baseURL}/patients/${patientId}/appointments`, {
      headers: this.getHeaders(),
      credentials: 'omit',
    });
    return this.handleResponse<Appointment[]>(response);
  }

  async getUpcomingAppointments(withinHours: number = 168): Promise<Appointment[]> {
    const response = await this.doFetch(`${this.baseURL}/patients/appointments/upcoming?within_hours=${withinHours}`, {
      headers: this.getHeaders(),
      credentials: this.isLocalDev ? 'omit' : 'include',
    });
    return this.handleResponse<Appointment[]>(response);
  }

  async createAppointment(appt: { patient_id: number; scheduled_at: string; title?: string; note?: string; notify_before_minutes?: number; }): Promise<Appointment> {
    const response = await fetch(`${this.baseURL}/patients/${appt.patient_id}/appointments`, {
      method: 'POST',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify({
        patient_id: appt.patient_id,
        scheduled_at: appt.scheduled_at,
        title: appt.title,
        note: appt.note,
        notify_before_minutes: appt.notify_before_minutes ?? 30,
      }),
      credentials: this.isLocalDev ? 'omit' : 'include',
    });
    return this.handleResponse<Appointment>(response);
  }

  async updateAppointment(appointmentId: number, update: Partial<{ title: string; note: string; scheduled_at: string; notify_before_minutes: number; }>): Promise<Appointment> {
    const response = await fetch(`${this.baseURL}/patients/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify(update),
      credentials: this.isLocalDev ? 'omit' : 'include',
    });
    return this.handleResponse<Appointment>(response);
  }

  async checkInAppointment(appointmentId: number): Promise<Appointment> {
    const response = await fetch(`${this.baseURL}/patients/appointments/${appointmentId}/check-in`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<Appointment>(response);
  }

  async deleteAppointment(appointmentId: number): Promise<{ ok: boolean }> {
    const response = await fetch(`${this.baseURL}/patients/appointments/${appointmentId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: this.isLocalDev ? 'omit' : 'include',
    });
    return this.handleResponse<{ ok: boolean }>(response);
  }

  async remindAppointment(appointmentId: number, inMinutes: number = 10): Promise<{ ok: boolean; in_minutes: number; }> {
    const response = await fetch(`${this.baseURL}/patients/appointments/${appointmentId}/remind?in_minutes=${inMinutes}`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Preferences
  async getPreferences(): Promise<any> {
    const response = await fetch(`${this.baseURL}/preferences/me`, {
      headers: this.getHeaders(),
      credentials: this.isLocalDev ? 'omit' : 'include',
    });
    return this.handleResponse<any>(response);
  }

  async updatePreferences(prefs: any): Promise<any> {
    const response = await fetch(`${this.baseURL}/preferences/me`, {
      method: 'PUT',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify(prefs),
      credentials: this.isLocalDev ? 'omit' : 'include',
    });
    return this.handleResponse<any>(response);
  }

  async resetPreferences(): Promise<any> {
    const response = await fetch(`${this.baseURL}/preferences/me/reset`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: this.isLocalDev ? 'omit' : 'include',
    });
    return this.handleResponse<any>(response);
  }

  // Nudge/Notification endpoints
  async getNotifications(params?: {
    limit?: number;
    mark_as_read?: boolean;
  }): Promise<{
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      type: string;
      sent_at: string;
      priority: string;
      delivery_status: string;
      action_url?: string;
      note_info?: any;
    }>;
    total_count: number;
    unread_count: number;
  }> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.mark_as_read) query.append('mark_as_read', 'true');

    const response = await fetch(`${this.baseURL}/nudge/notifications?${query}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async sendImmediateNudge(noteId: number, nudgeType: string = 'INLINE_READY_TO_SIGN'): Promise<{
    success: boolean;
    nudge_id: number;
    message: string;
  }> {
    const response = await fetch(`${this.baseURL}/nudge/send-immediate`, {
      method: 'POST',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify({
        note_id: noteId,
        nudge_type: nudgeType,
      }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async getNotificationPreferences(): Promise<{
    enable_inline_nudges: boolean;
    enable_digest_nudges: boolean;
    enable_morning_reminders: boolean;
    enable_escalation_alerts: boolean;
    in_app_notifications: boolean;
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
    weekend_notifications: boolean;
    max_daily_nudges: number;
    escalation_threshold_hours: number;
  }> {
    const response = await fetch(`${this.baseURL}/nudge/preferences`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async updateNotificationPreferences(preferences: any): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${this.baseURL}/nudge/preferences`, {
      method: 'PUT',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify(preferences),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async getUserStatus(): Promise<{
    status: string;
    status_message?: string;
    status_until?: string;
    auto_busy_during_appointments: boolean;
    auto_available_after_hours: boolean;
    last_activity: string;
  }> {
    const response = await fetch(`${this.baseURL}/nudge/status`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async updateUserStatus(statusData: {
    status?: string;
    status_message?: string;
    status_until?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${this.baseURL}/nudge/status`, {
      method: 'PUT',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify(statusData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async getDigestPreview(date?: string): Promise<{
    date: string;
    total_unsigned: number;
    estimated_time_minutes: number;
    notes: Array<{
      note_id: number;
      note_type: string;
      visit_id: number;
      patient_name: string;
      created_at: string;
      status: string;
    }>;
  }> {
    const query = date ? `?date=${date}` : '';
    const response = await fetch(`${this.baseURL}/nudge/digest/preview${query}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async sendDigest(date?: string): Promise<{
    success: boolean;
    nudge_id: number;
    message: string;
    notes_included: number;
  }> {
    const response = await fetch(`${this.baseURL}/nudge/digest/send`, {
      method: 'POST',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify({ date }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async getNudgeAnalytics(days: number = 7): Promise<{
    period_days: number;
    total_nudges_sent: number;
    nudges_by_type: Record<string, number>;
    delivery_status: Record<string, number>;
    note_completion: {
      total_notes: number;
      signed_notes: number;
      unsigned_notes: number;
      completion_rate: number;
    };
    average_nudges_per_day: number;
  }> {
    const response = await fetch(`${this.baseURL}/nudge/analytics?days=${days}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);