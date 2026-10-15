'use client';

import React, { useState, useRef, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Patient } from '@/types';
import { ClinicalNote } from '@/components/notes/clinical-note';
import { AudioCapture } from '@/components/notes/audio-capture';
import styles from './new-note.module.css';
import { useNoteDraft } from '@/hooks/use-note-draft';
import { draftKey } from '@/lib/note-draft';
import { useToast } from '@/lib/toast';
import { burstConfetti } from '@/lib/confetti';
import { recordNoteSession } from '@/lib/metrics';
import { TimingControl } from '@/components/ui/timing-control';
import { formatDateOfBirthWithAge } from '@/utils/date';

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const isSOAPNote = (value: unknown): value is SOAPNote => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.subjective === 'string' &&
    typeof candidate.objective === 'string' &&
    typeof candidate.assessment === 'string' &&
    typeof candidate.plan === 'string'
  );
};

const EMPTY_NEW_DRAFT = { content: '', selectedPatientId: '', visitId: '', noteType: '', status: 'pending_review', transcription: '', patientFirstName: '', patientLastName: '', patientDOB: '', patientPhone: '', patientEmail: '', patientAddress: '', soap_subjective: '', soap_objective: '', soap_assessment: '', soap_plan: '', audioName: '' };

function NewNotePageContent() {
  const { user } = useAuth();
  const { show } = useToast();
  const searchParams = useSearchParams();
  const [content, setContent] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [visitId, setVisitId] = useState('');
  const [noteType, setNoteType] = useState('');
  const [status, setStatus] = useState('pending_review'); // Always pending review for new notes
  const [isCapturingAudio, setIsCapturingAudio] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recoveredAudioName, setRecoveredAudioName] = useState('');
  const recoveredRef = useRef(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdNoteId, setCreatedNoteId] = useState<number | null>(null);
  
  // Patient management
  const [patientEntryMode, setPatientEntryMode] = useState<'existing' | 'new'>('existing');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  
  // Additional patient information fields
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [patientDOB, setPatientDOB] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  
  const autoStartedRef = useRef(false);
  const captureMode = searchParams.get('mode') || 'type';
  const creationStartedRef = useRef(Date.now());
  const router = useRouter();

  const draftValue = useMemo(() => ({ content, selectedPatientId, visitId, noteType, status, transcription, patientFirstName, patientLastName, patientDOB, patientPhone, patientEmail, patientAddress, soap_subjective: soapNote?.subjective || '', soap_objective: soapNote?.objective || '', soap_assessment: soapNote?.assessment || '', soap_plan: soapNote?.plan || '', audioName: audioFile?.name || recoveredAudioName }), [content, selectedPatientId, visitId, noteType, status, transcription, patientFirstName, patientLastName, patientDOB, patientPhone, patientEmail, patientAddress, soapNote, audioFile, recoveredAudioName]);
  const draft = useNoteDraft({
    scope: draftKey(user?.id || 0, 'new'), initial: EMPTY_NEW_DRAFT, value: draftValue,
    enabled: !!user && !user.is_demo,
    apply: saved => {
      recoveredRef.current = true;
      setContent(saved.content);
      setSelectedPatientId(saved.selectedPatientId);
      setPatientEntryMode(saved.selectedPatientId ? 'existing' : (saved.patientFirstName || saved.patientLastName || saved.patientDOB) ? 'new' : 'existing');
      setVisitId(saved.visitId);
      setNoteType(saved.noteType);
      setStatus(saved.status);
      setTranscription(saved.transcription);
      setPatientFirstName(saved.patientFirstName);
      setPatientLastName(saved.patientLastName);
      setPatientDOB(saved.patientDOB);
      setPatientPhone(saved.patientPhone);
      setPatientEmail(saved.patientEmail);
      setPatientAddress(saved.patientAddress);
      setRecoveredAudioName(saved.audioName);
      const restoredSoap = { subjective: saved.soap_subjective, objective: saved.soap_objective, assessment: saved.soap_assessment, plan: saved.soap_plan };
      setSoapNote(Object.values(restoredSoap).some(Boolean) ? restoredSoap : null);
    },
  });

  // Fetch patients on component mount and handle URL params
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const fetchedPatients = await apiClient.getPatients();
        setPatients(fetchedPatients);
        
        // Check if patient_id is provided in URL params
        const patientIdParam = searchParams.get('patient_id');
        if (patientIdParam && !recoveredRef.current) {
          setSelectedPatientId(patientIdParam);
        }
        
      } catch (error) {
        console.error('Failed to fetch patients:', error);
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [searchParams]);

  useEffect(() => {
    if (!user || autoStartedRef.current) return;
    autoStartedRef.current = true;
    if (captureMode === 'record' || searchParams.get('start_dictation') === '1') {
      // The recorder starts once its authenticated UI mounts.
    } else if (captureMode === 'upload') {
      document.querySelector<HTMLInputElement>('input[type="file"]')?.focus();
    } else {
      document.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
    }
  }, [user, captureMode, searchParams]);


  // Update selected patient when patient ID changes
  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find(p => p.id.toString() === selectedPatientId);
      setSelectedPatient(patient || null);
    } else {
      setSelectedPatient(null);
    }
  }, [selectedPatientId, patients]);

  const handleAudioReady = useCallback((file: File) => {
    setAudioFile(file);
    setTranscription('');
    setSoapNote(null);
    setError('');
  }, []);

  const transcribeAudio = async () => {
    if (isCapturingAudio || isTranscribing || isGeneratingSoap || loading) return;
    if (!audioFile) {
      setError('No audio file selected');
      return;
    }

    console.log('Starting transcription with file:', audioFile.name);
    
    setIsTranscribing(true);
    setError('');
    
    try {
      console.log('Transcribing audio...');

      const response = await apiClient.transcribeAudio(
        audioFile,
        true // Always summarize when transcribing
      );

      setTranscription(response.transcript);

      // Handle the summary response - convert dictionary to SOAPNote object
      if (response.summary) {
        // Convert the dictionary response to SOAPNote object
        const soapNoteData = response.summary;
        if (isSOAPNote(soapNoteData)) {
          setSoapNote({
            subjective: soapNoteData.subjective,
            objective: soapNoteData.objective,
            assessment: soapNoteData.assessment,
            plan: soapNoteData.plan
          });
        } else {
          setSoapNote(null);
        }
      } else {
        console.log('No summary received');
        setSoapNote(null);
      }

      // Check for summary error and show it to the user
      if (response.summary_error) {
        if (response.summary_error.includes("OpenAI API key")) {
          setError(`Transcription completed successfully! However, SOAP note generation requires an OpenAI API key. Please contact your administrator to configure the OpenAI API key in the server environment.`);
        } else {
          setError(`Transcription completed, but SOAP generation failed: ${response.summary_error}`);
        }
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError(`Failed to transcribe audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateSoapFromConversation = async () => {
    if (isCapturingAudio || isTranscribing || isGeneratingSoap || loading) return;
    const sourceText = (transcription || content || '').trim();
    if (!sourceText) {
      setError('Add typed notes or transcribe audio first to generate SOAP.');
      return;
    }

    setIsGeneratingSoap(true);
    setError('');
    try {
      const summary = await apiClient.summarizeNoteText(sourceText);
      setSoapNote(summary);
      show('SOAP note generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SOAP note');
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.pending || !draft.ready || isTranscribing || isGeneratingSoap || loading) return;
    if (patientEntryMode === 'existing' && !selectedPatientId) { setError('Select a patient or choose New patient.'); return; }
    if (isCapturingAudio) {
      setError('Stop recording before saving your note.');
      return;
    }
    setLoading(true);
    setError('');

    // Check if we need to create a new patient
    const hasPatientInfo = patientFirstName && patientLastName && patientDOB;
    let finalPatientId = selectedPatientId;

    // If patient information is provided but no patient is selected, create a new patient
    if (hasPatientInfo && !selectedPatientId) {
      try {
        const newPatient = await apiClient.createPatient({
          first_name: patientFirstName.trim(),
          last_name: patientLastName.trim(),
          date_of_birth: patientDOB,
          ...(patientPhone.trim() && { phone_number: patientPhone.trim() }),
          ...(patientEmail.trim() && { email: patientEmail.trim() }),
          ...(patientAddress.trim() && { address: patientAddress.trim() })
        });
        finalPatientId = newPatient.id.toString();
        setSelectedPatientId(finalPatientId);
        setPatients(previous => [...previous, newPatient]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create patient');
        setLoading(false);
        return;
      }
    }

    // Validate required fields
    if ((!selectedPatientId && !hasPatientInfo) || !noteType || (!content && !transcription)) {
      setError('Please fill in all required fields: Either select a patient or provide patient information (First Name, Last Name, Date of Birth), Note Type, and Content');
      setLoading(false);
      return;
    }

    // Validate that Patient ID is a valid number
    if (isNaN(parseInt(finalPatientId))) {
      setError('Patient ID must be a valid number');
      setLoading(false);
      return;
    }

    // Validate Visit ID if provided
    if (visitId && isNaN(parseInt(visitId))) {
      setError('Visit ID must be a valid number');
      setLoading(false);
      return;
    }

    if (!user?.id) {
      setError('User not authenticated. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const startedAt = Date.now();
      // Prepare the content - include manual content, transcription, and SOAP note if available
      let finalContent = content || transcription || '';
      
      // If we have a generated SOAP note, append it to the content (but don't duplicate)
      if (soapNote) {
        const soapText = `\n\n=== GENERATED SOAP NOTE ===\nSubjective: ${soapNote.subjective}\n\nObjective: ${soapNote.objective}\n\nAssessment: ${soapNote.assessment}\n\nPlan: ${soapNote.plan}`;
        
        // Remove any existing SOAP notes (both formats) to prevent duplication
        finalContent = finalContent.replace(/\n*=== GENERATED SOAP NOTE ===[\s\S]*$/g, '');
        finalContent = finalContent.replace(/\n*SOAP Summary:[\s\S]*$/g, '');
        
        // Add the new SOAP note
        finalContent = (finalContent.trim() || transcription || '') + soapText;
      }

      // Get client timezone information
      const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const clientTimestamp = new Date().toISOString();

      const noteData = {
        patient_id: parseInt(finalPatientId),
        provider_id: user.id, // Use current user's ID as provider
        visit_id: visitId ? parseInt(visitId) : undefined, // Optional - will be auto-generated if not provided
        note_type: noteType,
        content: finalContent,
        status: status,
        auto_transcribe: !!audioFile && !transcription,
        auto_summarize: !!audioFile && !soapNote,
        creation_method: audioFile ? 'voice_transcription' : soapNote ? 'ai_assisted' : 'handwritten',
        creation_started_at: new Date(creationStartedRef.current).toISOString(),
        creation_completed_at: new Date().toISOString(),
        baseline_time_minutes: 15,
        actual_time_minutes: Math.max(1, Math.ceil((Date.now() - creationStartedRef.current) / 60000)),
        time_saved_minutes: Math.max(0, 15 - Math.ceil((Date.now() - creationStartedRef.current) / 60000)),
        transcript: transcription || undefined,
        soap_subjective: soapNote?.subjective || undefined,
        soap_objective: soapNote?.objective || undefined,
        soap_assessment: soapNote?.assessment || undefined,
        soap_plan: soapNote?.plan || undefined,
        client_timezone: clientTimezone,
        client_timestamp: clientTimestamp,
        ...(audioFile && { audio_file: audioFile })
      };

      const created = await apiClient.createNote(noteData);
      const savedAt = Date.now();
      try { recordNoteSession({ id: String(created.id), startTime: new Date(creationStartedRef.current), baselineMinutes: 15 }); } catch {}
      draft.clear();
      setCreatedNoteId(created.id);
      show('Saved just now');
      router.push(`/notes/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    } finally {
      setLoading(false);
    }
  };

  const patientReady = patientEntryMode === 'existing'
    ? !!selectedPatientId
    : !!(patientFirstName.trim() && patientLastName.trim() && patientDOB);
  const busy = isCapturingAudio || isTranscribing || isGeneratingSoap || loading;
  const hasSource = !!(content.trim() || transcription.trim());
  const canSave = draft.ready && !draft.pending && !busy && hasSource && patientReady && !!noteType;

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>Workspace / Notes</p>
          <h1>Create a note</h1>
          <p>Capture the visit, add patient details, and review your draft.</p>
        </header>

        {error && <div className={styles.error} role="alert">{error}</div>}
        {draft.pending && <section role="status" className={styles.recovery}>
          <strong>A draft from this tab is available.</strong>
          <p>Restore it to pick up where you left off, or start fresh.</p>
          <div className={styles.recoveryActions}>
            <Button type="button" variant="secondary" onClick={draft.restore}>Restore draft</Button>
            <button type="button" onClick={draft.discard}>Discard recovery copy</button>
          </div>
        </section>}
        {draft.storageError && <p role="status" className={styles.notice}>Tab recovery is unavailable. Keep this page open until your note is saved.</p>}
        {recoveredAudioName && !audioFile && <p role="status" className={styles.notice}>Your text was recovered. Reattach {recoveredAudioName} to use the original audio.</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <fieldset disabled={!!draft.pending || !draft.ready} className={styles.fields}>
            <div className={styles.columns}>
              <div className={styles.captureColumn}>
                <AudioCapture
                  audioFile={audioFile}
                  onAudioReady={handleAudioReady}
                  onBusyChange={setIsCapturingAudio}
                  onTranscribe={transcribeAudio}
                  isTranscribing={isTranscribing}
                  disabled={loading || isGeneratingSoap || !draft.ready || !!draft.pending}
                  autoStart={captureMode === 'record' || searchParams.get('start_dictation') === '1'}
                />

                <section className={styles.card} aria-labelledby="visit-notes-title">
                  <div className={styles.cardHeading}>
                    <div>
                      <h2 id="visit-notes-title">Visit notes</h2>
                      <p>Type your notes or add context to your recording.</p>
                    </div>
                    <DocumentTextIcon className={styles.sectionIcon} aria-hidden="true" />
                  </div>
                  <label htmlFor="manual-notes" className="sr-only">Manual notes</label>
                  <textarea
                    id="manual-notes"
                    aria-label="Manual notes"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start with the reason for the visit, symptoms, findings, and next steps…"
                    rows={10}
                    className={styles.notesInput}
                  />
                  <div className={styles.generateRow}>
                    <p>Turn your visit notes into a structured SOAP draft.</p>
                    <Button type="button" variant="secondary" onClick={generateSoapFromConversation}
                      disabled={!!draft.pending || isCapturingAudio || isTranscribing || loading || !hasSource}
                      loading={isGeneratingSoap} aria-busy={isGeneratingSoap}>
                      <SparklesIcon className={styles.buttonIcon} aria-hidden="true" />
                      {isGeneratingSoap ? 'Generating SOAP…' : 'Generate SOAP'}
                    </Button>
                    <span className="sr-only" role="status">{isGeneratingSoap ? 'Generating SOAP…' : ''}</span>
                  </div>
                </section>
              </div>

              <aside className={styles.detailsColumn} aria-labelledby="visit-details-title">
                <section className={styles.card}>
                  <div className={styles.cardHeading}>
                    <div>
                      <h2 id="visit-details-title">Visit details</h2>
                      <p>Connect this note to the right patient.</p>
                    </div>
                  </div>
                  <div className={styles.patientSwitch} aria-label="Patient entry method">
                    <button type="button" aria-pressed={patientEntryMode === 'existing'} onClick={() => setPatientEntryMode('existing')}>Existing patient</button>
                    <button type="button" aria-pressed={patientEntryMode === 'new'} onClick={() => { setPatientEntryMode('new'); setSelectedPatientId(''); }}>New patient</button>
                  </div>

                  {patientEntryMode === 'existing' ? <div className={styles.fieldGroup}>
                    <label className={styles.field}>
                      <span>Patient <span className={styles.required}>*</span></span>
                      <select aria-label="Patient" value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} disabled={loadingPatients} required>
                        <option value="">{loadingPatients ? 'Loading patients…' : 'Select a patient'}</option>
                        {patients.map(patient => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name} (ID: {patient.id})</option>)}
                      </select>
                    </label>
                    {!loadingPatients && patients.length === 0 && <p className={styles.help}>No patients yet. Choose “New patient” to add one.</p>}
                    {selectedPatient && <div className={styles.patientSummary}>
                      <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong>
                      <span>DOB: {formatDateOfBirthWithAge(selectedPatient.date_of_birth)}</span>
                      {selectedPatient.phone_number && <span>{selectedPatient.phone_number}</span>}
                      {selectedPatient.email && <span>{selectedPatient.email}</span>}
                    </div>}
                  </div> : <div className={styles.patientFields}>
                    <label className={styles.field}><span>First name <span className={styles.required}>*</span></span><Input value={patientFirstName} onChange={e => setPatientFirstName(e.target.value)} placeholder="Enter first name" autoComplete="off" required /></label>
                    <label className={styles.field}><span>Last name <span className={styles.required}>*</span></span><Input value={patientLastName} onChange={e => setPatientLastName(e.target.value)} placeholder="Enter last name" autoComplete="off" required /></label>
                    <label className={styles.field}><span>Date of birth <span className={styles.required}>*</span></span><Input type="date" value={patientDOB} onChange={e => setPatientDOB(e.target.value)} required /></label>
                    <label className={styles.field}><span>Phone <small>Optional</small></span><Input type="tel" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="(555) 123-4567" /></label>
                    <label className={styles.field}><span>Email <small>Optional</small></span><Input type="email" value={patientEmail} onChange={e => setPatientEmail(e.target.value)} placeholder="patient@example.com" /></label>
                    <label className={styles.field}><span>Address <small>Optional</small></span><Input value={patientAddress} onChange={e => setPatientAddress(e.target.value)} placeholder="123 Main Street" /></label>
                  </div>}

                  <div className={styles.noteDetails}>
                    <label className={styles.field}>
                      <span>Note type <span className={styles.required}>*</span></span>
                      <select aria-label="Note type" value={noteType} onChange={e => setNoteType(e.target.value)} required>
                        <option value="">Select note type</option>
                        <option value="consultation">Consultation</option><option value="follow-up">Follow-up</option>
                        <option value="physical">Physical Examination</option><option value="urgent">Urgent Care</option>
                        <option value="post-op">Post-Operative</option><option value="admission">Admission</option>
                        <option value="discharge">Discharge</option><option value="progress">Progress Note</option><option value="other">Other</option>
                      </select>
                    </label>
                    <div className={styles.reviewStatus}><span>Status</span><span className={styles.statusBadge}>Pending review</span></div>
                    <details className={styles.advanced}>
                      <summary>Visit reference <span>Optional</span></summary>
                      <label className={styles.field}><span>Visit ID</span><Input type="text" inputMode="numeric" value={visitId} onChange={e => setVisitId(e.target.value)} placeholder="Generated automatically" /></label>
                      <p className={styles.help}>Leave blank to create a reference for this visit.</p>
                    </details>
                  </div>
                </section>
                <p className={styles.contextHint}>Review the transcript and generated content before approving your note.</p>
              </aside>
            </div>

            {(transcription || soapNote) && <ClinicalNote
              title="Visit result · Draft for review"
              transcript={transcription || content}
              sourceLabel={transcription ? 'Transcript' : 'Visit notes'}
              soap={soapNote || { subjective: '', objective: '', assessment: '', plan: '' }}
              caption="Save the note to review, edit, approve, and export it."
            />}
            {createdNoteId && <TimingControl noteId={createdNoteId} />}

            <footer className={styles.saveBar}>
              <div><h2>Save for review</h2><p>{canSave ? 'Your note will be saved as pending review.' : 'Add visit notes, choose a patient, and select a note type.'}</p></div>
              <Button type="submit" disabled={!canSave} loading={loading} className={styles.saveButton}>{loading ? 'Saving…' : 'Save Note'}</Button>
            </footer>
          </fieldset>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function NewNotePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewNotePageContent />
    </Suspense>
  );
}
