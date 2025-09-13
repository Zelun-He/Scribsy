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
  // Transcription and AI processing fields
  transcript?: string;  // Full transcribed conversation
  soap_subjective?: string;  // SOAP: Subjective
  soap_objective?: string;   // SOAP: Objective  
  soap_assessment?: string;  // SOAP: Assessment
  soap_plan?: string;        // SOAP: Plan
  // AI accuracy tracking
  original_content?: string;  // Original AI-generated content
  accuracy_score?: number;    // Accuracy percentage (0-100)
  content_changes_count?: number;  // Number of times content was modified
  // Note creation method and timing tracking
  creation_method?: string;  // handwritten, ai_assisted, ai_generated, voice_transcription
  creation_started_at?: string;  // When note creation began
  creation_completed_at?: string;  // When note was saved
  baseline_time_minutes?: number;  // Expected time for this creation method
  actual_time_minutes?: number;  // Actual time taken
  time_saved_minutes?: number;  // Time saved vs baseline
  // Enhanced with patient information
  patient_first_name?: string;
  patient_last_name?: string;
  patient_date_of_birth?: string;
  patient_phone_number?: string;
  patient_email?: string;
}

export interface NoteCode {
  id: number;
  note_id: number;
  system: 'ICD10' | 'SNOMED' | 'CPT' | 'RxNorm' | 'LOINC' | 'HCC' | string;
  code: string;
  display?: string;
  confidence?: number; // 0..1
  status: 'suggested' | 'accepted' | 'rejected' | string;
  source_span?: string;
  created_at: string;
}

export interface NoteProvenance {
  id: number;
  note_id: number;
  section?: string; // subjective/objective/assessment/plan/content
  sentence_index: number;
  text: string;
  transcript_start_ms?: number;
  transcript_end_ms?: number;
  audio_start_ms?: number;
  audio_end_ms?: number;
  confidence?: number; // 0..1
  created_at: string;
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

export interface Appointment {
  id: number;
  patient_id: number;
  user_id: number;
  title?: string;
  note?: string;
  scheduled_at: string;
  notify_before_minutes: number;
  notified: boolean;
  status?: string;
  checked_in_at?: string;
  created_at: string;
  updated_at: string;
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