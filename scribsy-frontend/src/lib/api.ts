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
  ApiError,
  NoteCode,
  NoteProvenance,
} from '@/types';

// Default to backend dev port 8000 unless overridden. When running on localhost, prefer Next proxy /api
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? '/api' : 'http://127.0.0.1:8000');



class ApiClient {
  private baseURL: string;
  private token: string | null = null; // kept for backward co
  // mpatibility
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
    try {
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
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Return a mock login response for development when backend is unavailable
        console.warn('Backend unavailable, using mock login for development');
        if (credentials.username === 'testuser' && credentials.password === 'testpass123') {
          const mockResult = {
            access_token: 'mock_token_for_development',
            token_type: 'bearer' as const,
            user: {
              id: 1,
              username: 'testuser',
              email: 'test@example.com',
              is_active: true,
              is_admin: false,
              tenant_id: 'default',
              work_start_time: '09:00',
              work_end_time: '17:00',
              timezone: 'UTC',
              working_days: '1,2,3,4,5'
            }
          };
          this.setToken(mockResult.access_token);
          return mockResult;
        } else {
          throw new Error('Invalid credentials');
        }
      }
      throw error;
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
    try {
      const response = await fetch(`${this.baseURL}/auth/me`, {
        headers: this.getHeaders(),
        credentials: 'include',
      });

      return this.handleResponse<User>(response);
    } catch (error) {
      // Handle CORS or network errors gracefully
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Return a mock user for development when backend is unavailable
        console.warn('Backend unavailable, using mock user for development');
        return {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          is_active: true,
          is_admin: false,
          tenant_id: 'default',
          work_start_time: '09:00',
          work_end_time: '17:00',
          timezone: 'UTC',
          working_days: '1,2,3,4,5'
        };
      }
      throw error;
    }
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

  // Password reset endpoints
  async requestPasswordReset(email: string): Promise<{ message: string; success: boolean }> {
    const response = await fetch(`${this.baseURL}/auth/request-password-reset`, {
      method: 'POST',
      headers: this.getJsonHeaders(),
      body: JSON.stringify({ email }),
      credentials: 'include',
    });

    return this.handleResponse<{ message: string; success: boolean }>(response);
  }

  async verifyPasswordReset(token: string, newPassword: string): Promise<{ message: string; success: boolean }> {
    const response = await fetch(`${this.baseURL}/auth/verify-password-reset`, {
      method: 'POST',
      headers: this.getJsonHeaders(),
      body: JSON.stringify({ token, new_password: newPassword }),
      credentials: 'include',
    });

    return this.handleResponse<{ message: string; success: boolean }>(response);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string; success: boolean }> {
    this.refreshTokenFromStorage();
    const response = await fetch(`${this.baseURL}/auth/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ 
        current_password: currentPassword, 
        new_password: newPassword 
      }),
      credentials: 'include',
    });

    return this.handleResponse<{ message: string; success: boolean }>(response);
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

  async listComments(noteId: number): Promise<Array<{id:number;note_id:number;user_id:number;username:string;body:string;created_at:string;}>> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/comments`, { headers: this.getHeaders(), credentials: 'include' });
    return this.handleResponse(resp);
  }

  async addComment(noteId: number, body: string): Promise<{id:number;note_id:number;user_id:number;username:string;body:string;created_at:string;}> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/comments`, {
      method: 'POST',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      credentials: 'include',
      body: JSON.stringify({ body }),
    });
    return this.handleResponse(resp);
  }

  async listHistory(noteId: number): Promise<Array<{id:number;note_id:number;user_id:number;username:string;action:string;summary:string;created_at:string;}>> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/history`, { headers: this.getHeaders(), credentials: 'include' });
    return this.handleResponse(resp);
  }

  // Export endpoints
  async exportNoteCCD(id: number): Promise<string> {
    const resp = await fetch(`${this.baseURL}/notes/${id}/export/ccd`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    if (!resp.ok) throw new Error(`Failed to export CCD: ${resp.status}`);
    return resp.text();
  }

  async exportNotePlain(id: number): Promise<string> {
    const resp = await fetch(`${this.baseURL}/notes/${id}/export/plain`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    if (!resp.ok) throw new Error(`Failed to export note: ${resp.status}`);
    return resp.text();
  }

  async exportNotePDF(id: number): Promise<Blob> {
    const resp = await fetch(`${this.baseURL}/notes/${id}/export/pdf`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    if (!resp.ok) {
      if (resp.status === 503) throw new Error('PDF_UNAVAILABLE');
      throw new Error(`Failed to export PDF: ${resp.status}`);
    }
    return resp.blob();
  }

  async exportNoteAudio(id: number): Promise<Blob> {
    const resp = await fetch(`${this.baseURL}/notes/${id}/export/audio`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    if (!resp.ok) {
      throw new Error(`Failed to export audio: ${resp.status}`);
    }
    return resp.blob();
  }

  // Provenance & Codes
  async listProvenance(noteId: number): Promise<NoteProvenance[]> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/provenance`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<NoteProvenance[]>(resp);
  }

  async listCodes(noteId: number): Promise<NoteCode[]> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/codes`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<NoteCode[]>(resp);
  }

  async acceptCode(noteId: number, codeId: number): Promise<NoteCode> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/codes/${codeId}/accept`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<NoteCode>(resp);
  }

  async rejectCode(noteId: number, codeId: number): Promise<NoteCode> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/codes/${codeId}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<NoteCode>(resp);
  }

  // Comments
  async getNoteComments(noteId: number): Promise<Array<{id: number; note_id: number; user_id: number; username: string; content: string; is_resolved: boolean; created_at: string; updated_at: string}>> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/comments`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<Array<{id: number; note_id: number; user_id: number; username: string; content: string; is_resolved: boolean; created_at: string; updated_at: string}>>(resp);
  }

  async createNoteComment(noteId: number, content: string, isResolved: boolean = false): Promise<{id: number; note_id: number; user_id: number; username: string; content: string; is_resolved: boolean; created_at: string; updated_at: string}> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/comments`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ content, is_resolved: isResolved }),
    });
    return this.handleResponse<{id: number; note_id: number; user_id: number; username: string; content: string; is_resolved: boolean; created_at: string; updated_at: string}>(resp);
  }

  async updateNoteComment(noteId: number, commentId: number, content?: string, isResolved?: boolean): Promise<{id: number; note_id: number; user_id: number; username: string; content: string; is_resolved: boolean; created_at: string; updated_at: string}> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/comments/${commentId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ content, is_resolved: isResolved }),
    });
    return this.handleResponse<{id: number; note_id: number; user_id: number; username: string; content: string; is_resolved: boolean; created_at: string; updated_at: string}>(resp);
  }

  async deleteNoteComment(noteId: number, commentId: number): Promise<{ok: boolean}> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<{ok: boolean}>(resp);
  }

  // Change History
  async getNoteHistory(noteId: number): Promise<Array<{id: number; note_id: number; user_id: number; username: string; action: string; summary: string; created_at: string}>> {
    const resp = await fetch(`${this.baseURL}/notes/${noteId}/history`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<Array<{id: number; note_id: number; user_id: number; username: string; action: string; summary: string; created_at: string}>>(resp);
  }

  async createNote(noteData: CreateNoteRequest): Promise<Note> {
    // Prefer JSON endpoint when no audio_file is included
    if (!noteData.audio_file) {
      try {
        const response = await fetch(`${this.baseURL}/notes/create-json`, {
          method: 'POST',
          headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
          body: JSON.stringify({
            patient_id: noteData.patient_id,
            provider_id: noteData.provider_id,
            visit_id: noteData.visit_id,
            note_type: noteData.note_type,
            content: noteData.content,
            status: noteData.status,
            signed_at: noteData.signed_at,
          }),
          credentials: 'include',
        });
        if (response.ok) {
          return this.handleResponse<Note>(response);
        }
        // Fallback in case server doesn't recognize JSON route
        if (response.status === 404 || response.status === 405) {
          // continue to multipart fallback below
        } else {
          return this.handleResponse<Note>(response);
        }
      } catch (_err) {
        // Fallback to multipart below
      }
    }

    // Fallback to multipart when audio is present
    const formData = new FormData();
    formData.append('patient_id', noteData.patient_id.toString());
    formData.append('provider_id', noteData.provider_id.toString());
    if (noteData.visit_id) formData.append('visit_id', noteData.visit_id.toString());
    formData.append('note_type', noteData.note_type);
    formData.append('content', noteData.content);
    formData.append('status', noteData.status);
    if (noteData.signed_at) formData.append('signed_at', noteData.signed_at);
    if (noteData.audio_file) formData.append('audio_file', noteData.audio_file);
    if (noteData.auto_transcribe !== undefined) formData.append('auto_transcribe', noteData.auto_transcribe.toString());
    if (noteData.auto_summarize !== undefined) formData.append('auto_summarize', noteData.auto_summarize.toString());

    let response = await fetch(`${this.baseURL}/notes/`, {
      method: 'POST',
      headers: { Authorization: this.token ? `Bearer ${this.token}` : '' },
      body: formData,
      credentials: 'include',
    });
    if (!response.ok && (response.status === 404 || response.status === 405)) {
      // As a last resort, bypass proxy and hit backend directly in dev
      try {
        const direct = await fetch(`http://127.0.0.1:8000/notes/`, {
          method: 'POST',
          headers: { Authorization: this.token ? `Bearer ${this.token}` : '' },
          body: formData,
          credentials: 'include',
        });
        response = direct;
      } catch {}
    }
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

  // Note Creation Timing Methods
  async startNoteTiming(noteId: number, creationMethod: string, baselineMinutes?: number): Promise<{
    message: string;
    creation_method: string;
    baseline_minutes: number;
    started_at: string;
  }> {
    const params = new URLSearchParams({
      creation_method: creationMethod,
    });
    if (baselineMinutes !== undefined) {
      params.append('baseline_minutes', baselineMinutes.toString());
    }

    const response = await fetch(`${this.baseURL}/notes/${noteId}/start-timing?${params}`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async completeNoteTiming(noteId: number): Promise<{
    message: string;
    creation_method: string;
    baseline_minutes: number;
    actual_minutes: number;
    time_saved_minutes: number;
    efficiency_percentage: number;
    completed_at: string;
  }> {
    const response = await fetch(`${this.baseURL}/notes/${noteId}/complete-timing`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  async getNoteTimingStats(method?: string, days: number = 30): Promise<{
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
  }> {
    const params = new URLSearchParams({
      days: days.toString(),
    });
    if (method) {
      params.append('method', method);
    }

    const response = await fetch(`${this.baseURL}/notes/timing-stats?${params}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
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
    // Try without trailing slash first (some proxies strip it)
    const attempts: Array<{ url: string; init: RequestInit }> = [
      {
        url: `${this.baseURL}/patients`,
        init: {
          method: 'POST',
          headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
          body: JSON.stringify(patientData),
          credentials: 'include',
        },
      },
      {
        url: `${this.baseURL}/patients/`,
        init: {
          method: 'POST',
          headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
          body: JSON.stringify(patientData),
          credentials: 'include',
        },
      },
      {
        url: `${this.baseURL}/patients/create`,
        init: {
          method: 'POST',
          headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
          body: JSON.stringify(patientData),
          credentials: 'include',
        },
      },
      {
        url: `${this.baseURL}/patients/create/`,
        init: {
          method: 'POST',
          headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
          body: JSON.stringify(patientData),
          credentials: 'include',
        },
      },
      // Direct dev fallback
      {
        url: `http://127.0.0.1:8000/patients`,
        init: {
          method: 'POST',
          headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
          body: JSON.stringify(patientData),
          credentials: 'include',
        },
      },
      {
        url: `http://127.0.0.1:8000/patients/`,
        init: {
          method: 'POST',
          headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
          body: JSON.stringify(patientData),
          credentials: 'include',
        },
      },
      {
        url: `http://127.0.0.1:8000/patients/create`,
        init: {
          method: 'POST',
          headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
          body: JSON.stringify(patientData),
          credentials: 'include',
        },
      },
      {
        url: `http://127.0.0.1:8000/patients/create/`,
        init: {
          method: 'POST',
          headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
          body: JSON.stringify(patientData),
          credentials: 'include',
        },
      },
    ];

    let lastResp: Response | null = null;
    for (const a of attempts) {
      try {
        const r = await fetch(a.url, a.init);
        lastResp = r;
        if (r.ok) return this.handleResponse<Patient>(r);
        if (!(r.status === 404 || r.status === 405)) {
          // propagate other errors with body
          return this.handleResponse<Patient>(r);
        }
      } catch {
        continue;
      }
    }
    if (lastResp) return this.handleResponse<Patient>(lastResp);
    throw new Error('Failed to create patient');
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
      credentials: 'include',
    });
    return this.handleResponse<Appointment[]>(response);
  }

  async getUpcomingAppointments(withinHours: number = 168): Promise<Appointment[]> {
    const response = await this.doFetch(`${this.baseURL}/patients/appointments/upcoming?within_hours=${withinHours}`, {
      headers: this.getHeaders(),
      credentials: 'include',
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
      credentials: 'include',
    });
    return this.handleResponse<Appointment>(response);
  }

  async updateAppointment(appointmentId: number, update: Partial<{ title: string; note: string; scheduled_at: string; notify_before_minutes: number; }>): Promise<Appointment> {
    const response = await fetch(`${this.baseURL}/patients/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: { ...this.getJsonHeaders(), ...this.getHeaders() },
      body: JSON.stringify(update),
      credentials: 'include',
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
      credentials: 'include',
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

  // Working Hours Management
  async getWorkingHours(): Promise<{
    work_start_time: string;
    work_end_time: string;
    timezone: string;
    working_days: number[];
    is_workday: boolean;
    time_until_end: number | null;
    pending_notes_count: number;
  }> {
    this.refreshTokenFromStorage();
    // Use direct backend URL to avoid Next.js proxy trailing slash issues
    const backendURL = this.isLocalDev ? 'http://127.0.0.1:8000' : this.baseURL;
    const resp = await fetch(`${backendURL}/working-hours/`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    
    return this.handleResponse(resp);
  }

  async updateWorkingHours(workingHours: {
    work_start_time: string;
    work_end_time: string;
    timezone: string;
    working_days: number[];
  }): Promise<{
    work_start_time: string;
    work_end_time: string;
    timezone: string;
    working_days: number[];
    is_workday: boolean;
    time_until_end: number | null;
    pending_notes_count: number;
  }> {
    this.refreshTokenFromStorage();
    // Use direct backend URL to avoid Next.js proxy trailing slash issues
    const backendURL = this.isLocalDev ? 'http://127.0.0.1:8000' : this.baseURL;
    const resp = await fetch(`${backendURL}/working-hours/`, {
      method: 'PUT',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(workingHours),
    });
    return this.handleResponse(resp);
  }

  async getFinalizationWarning(): Promise<{
    should_warn: boolean;
    reason: string;
    minutes_remaining?: number;
    pending_notes_count?: number;
  }> {
    this.refreshTokenFromStorage();
    // Use direct backend URL to avoid Next.js proxy trailing slash issues
    const backendURL = this.isLocalDev ? 'http://127.0.0.1:8000' : this.baseURL;
    const resp = await fetch(`${backendURL}/working-hours/finalization-warning`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(resp);
  }

  async getPendingNotesToday(): Promise<Array<{
    id: number;
    title: string;
    status: string;
    created_at: string;
    patient_id: number;
  }>> {
    this.refreshTokenFromStorage();
    // Use direct backend URL to avoid Next.js proxy trailing slash issues
    const backendURL = this.isLocalDev ? 'http://127.0.0.1:8000' : this.baseURL;
    const resp = await fetch(`${backendURL}/working-hours/pending-notes-today`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(resp);
  }

  // Export functionality
  async exportUserData(format: 'json' | 'csv' | 'zip' = 'zip') {
    this.refreshTokenFromStorage();
    const backendURL = this.isLocalDev ? 'http://127.0.0.1:8000' : this.baseURL;
    const resp = await fetch(`${backendURL}/export/data?format=${format}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    
    if (!resp.ok) {
      throw new Error(`Export failed: ${resp.statusText}`);
    }
    
    // Create download link
    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from Content-Disposition header or create default
    const contentDisposition = resp.headers.get('Content-Disposition');
    let filename = `scribsy_export_${new Date().toISOString().split('T')[0]}`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return { success: true, filename };
  }

  // Audio download functionality
  async downloadAudioFile(noteId: number) {
    this.refreshTokenFromStorage();
    const backendURL = this.isLocalDev ? 'http://127.0.0.1:8000' : this.baseURL;
    const resp = await fetch(`${backendURL}/export/audio/${noteId}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });
    
    if (!resp.ok) {
      throw new Error(`Failed to get audio file: ${resp.statusText}`);
    }
    
    const audioInfo = await resp.json();
    
    // For now, we'll show the audio info
    // In a full implementation, you'd download the actual file
    return {
      success: true,
      audioInfo,
      message: 'Audio file info retrieved. Full download implementation needed.'
    };
  }
}

export const apiClient = new ApiClient(API_BASE_URL);