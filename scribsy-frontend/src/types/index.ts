export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone_number?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  patient_id: number;
  provider_id: number;
  visit_id: number;
  note_type: string;
  content: string;
  created_at: string;
  updated_at: string;
  signed_at?: string;
  status: string;
  audio_file?: string;
  // Enhanced with patient information
  patient_first_name?: string;
  patient_last_name?: string;
  patient_date_of_birth?: string;
  patient_phone_number?: string;
  patient_email?: string;
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface TranscriptionResult {
  transcript: string;
  user_id: number;
  username: string;
  summary?: SOAPNote | {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  } | null;
  summary_error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CreateNoteRequest {
  patient_id: number;
  provider_id: number;
  visit_id?: number; // Optional - will be auto-generated if not provided
  note_type: string;
  content: string;
  status: string;
  signed_at?: string;
  audio_file?: File;
  auto_transcribe?: boolean;
  auto_summarize?: boolean;
}

export interface ApiError {
  detail: string;
}

export interface Theme {
  mode: 'light' | 'dark';
}