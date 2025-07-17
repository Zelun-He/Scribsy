export interface User {
  id: number;
  username: string;
  is_active: boolean;
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
  summary?: SOAPNote;
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
  visit_id: number;
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