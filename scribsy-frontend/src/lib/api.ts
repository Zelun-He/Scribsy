import { 
  LoginRequest, 
  RegisterRequest, 
  LoginResponse, 
  User, 
  Patient,
  Note, 
  CreateNoteRequest, 
  TranscriptionResult,
  ApiError 
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8002';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private authFailureCallback: (() => void) | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
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
    this.refreshTokenFromStorage(); // Ensure token is always up-to-date
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Handle authentication errors specifically
      if (response.status === 401) {
        this.clearToken();
        // Call the auth failure callback if it exists
        if (this.authFailureCallback) {
          this.authFailureCallback();
        }
        throw new Error('Authentication failed');
      }
      
      try {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'An error occurred');
      } catch {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
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
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await fetch(`${this.baseURL}/auth/token`, {
      method: 'POST',
      body: formData,
    });

    const result = await this.handleResponse<LoginResponse>(response);
    this.setToken(result.access_token);
    return result;
  }

  async register(userData: RegisterRequest): Promise<User> {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(userData),
    });

    return this.handleResponse<User>(response);
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  // Notes endpoints
  async getNotes(params?: {
    skip?: number;
    limit?: number;
    patient_id?: number;
    visit_id?: number;
    note_type?: string;
    status?: string;
  }): Promise<Note[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${this.baseURL}/notes/?${query}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<Note[]>(response);
  }

  async getNote(id: number): Promise<Note> {
    const response = await fetch(`${this.baseURL}/notes/${id}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<Note>(response);
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
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    return this.handleResponse<Note>(response);
  }

  async updateNote(id: number, noteData: Partial<CreateNoteRequest>): Promise<Note> {
    const response = await fetch(`${this.baseURL}/notes/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(noteData),
    });

    return this.handleResponse<Note>(response);
  }

  async deleteNote(id: number): Promise<{ ok: boolean }> {
    const response = await fetch(`${this.baseURL}/notes/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
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
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
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

    const response = await fetch(`${this.baseURL}/patients/?${params}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<Patient[]>(response);
  }

  async getPatient(id: number): Promise<Patient> {
    const response = await fetch(`${this.baseURL}/patients/${id}`, {
      headers: this.getHeaders(),
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
      headers: this.getHeaders(),
      body: JSON.stringify(patientData),
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
    const response = await fetch(`${this.baseURL}/patients/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(patientData),
    });

    return this.handleResponse<Patient>(response);
  }

  async deletePatient(id: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/patients/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
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
    });

    return this.handleResponse<Patient[]>(response);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);