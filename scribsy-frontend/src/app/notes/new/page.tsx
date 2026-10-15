'use client';

import React, { useState, useRef, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DocumentTextIcon,
  SparklesIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Patient } from '@/types';
import { ClinicalNote } from '@/components/notes/clinical-note';
import { AudioCapture } from '@/components/notes/audio-capture';
import { GenerateButton } from '@/components/ui/generate-button';
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
      document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-emerald-100">
              Create New Note
            </h1>
            <div className="flex flex-wrap items-center gap-3">
            <GenerateButton
              type="button"
              onClick={generateSoapFromConversation}
              disabled={!!draft.pending || isCapturingAudio || isTranscribing || loading || (!content.trim() && !transcription.trim())}
              loading={isGeneratingSoap}
              label="Generate SOAP"
              loadingLabel="Generating SOAP…"
            />
            <Button
              onClick={handleSubmit}
              disabled={!!draft.pending || isCapturingAudio || isTranscribing || isGeneratingSoap || loading || (!content && !transcription) || (!selectedPatientId && !(patientFirstName && patientLastName && patientDOB)) || !noteType}
              loading={loading}
            >
              {loading ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {draft.pending && <section role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-slate-900"><p>A draft from this tab is available. Restore it or start fresh.</p><div className="flex gap-4 mt-2"><button type="button" className="underline" onClick={draft.restore}>Restore draft</button><button type="button" className="underline" onClick={draft.discard}>Discard recovery copy</button></div></section>}
        {draft.storageError && <p role="status">Tab recovery is unavailable. Keep this page open until your note is saved.</p>}
        {recoveredAudioName && !audioFile && <p role="status">Your text was recovered. Reattach {recoveredAudioName} to use the original audio.</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={!!draft.pending} className="contents">
          <AudioCapture
            audioFile={audioFile}
            onAudioReady={handleAudioReady}
            onBusyChange={setIsCapturingAudio}
            onTranscribe={transcribeAudio}
            isTranscribing={isTranscribing}
            disabled={loading || isGeneratingSoap || !draft.ready || !!draft.pending}
            autoStart={captureMode === 'record' || searchParams.get('start_dictation') === '1'}
          />
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>
                Required fields for proper note management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    Patient *
                  </label>
                  <select
                    aria-label="Patient"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 dark:border-emerald-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 bg-gray-50 dark:bg-gray-800 dark:text-emerald-100"
                    disabled={loadingPatients}
                  >
                    <option value="">{loadingPatients ? 'Loading patients...' : 'Select an existing patient'}</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} (ID: {patient.id})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    OR create a new patient in the form below
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    Visit ID (Auto-generated)
                  </label>
                  <Input
                    type="text"
                    value={visitId}
                    onChange={(e) => setVisitId(e.target.value)}
                    placeholder="Leave empty for auto-generation"
                    className="h-10 text-sm bg-gray-50 dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave empty to auto-generate based on patient and date
                  </p>
                </div>
              </div>
              
              {/* Selected Patient Information */}
              {selectedPatient && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                    Selected Patient Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-800 dark:text-blue-200">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-800 dark:text-blue-200">
                        DOB: {formatDateOfBirthWithAge(selectedPatient.date_of_birth)}
                      </span>
                    </div>
                    {selectedPatient.phone_number && (
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-blue-800 dark:text-blue-200">
                          {selectedPatient.phone_number}
                        </span>
                      </div>
                    )}
                    {selectedPatient.email && (
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-blue-800 dark:text-blue-200">
                          {selectedPatient.email}
                        </span>
                      </div>
                    )}
                    {selectedPatient.address && (
                      <div className="flex items-start gap-2 col-span-full">
                        <MapPinIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <span className="text-blue-800 dark:text-blue-200">
                          {selectedPatient.address}
                          {selectedPatient.city && selectedPatient.state && (
                            <span>, {selectedPatient.city}, {selectedPatient.state} {selectedPatient.zip_code}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Patient Information */}
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Patient Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                      First Name
                    </label>
                    <Input
                      type="text"
                      value={patientFirstName}
                      onChange={(e) => setPatientFirstName(e.target.value)}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                      Last Name
                    </label>
                    <Input
                      type="text"
                      value={patientLastName}
                      onChange={(e) => setPatientLastName(e.target.value)}
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={patientDOB}
                      onChange={(e) => setPatientDOB(e.target.value)}
                      placeholder="Enter date of birth"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="patient@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                      Address
                    </label>
                    <Input
                      type="text"
                      value={patientAddress}
                      onChange={(e) => setPatientAddress(e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    Note Type *
                  </label>
                  <select
                    aria-label="Note type"
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-emerald-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 dark:bg-gray-800 dark:text-emerald-100"
                    required
                  >
                    <option value="">Select note type</option>
                    <option value="consultation">Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="physical">Physical Examination</option>
                    <option value="urgent">Urgent Care</option>
                    <option value="post-op">Post-Operative</option>
                    <option value="admission">Admission</option>
                    <option value="discharge">Discharge</option>
                    <option value="progress">Progress Note</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    Status
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-emerald-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Pending Review (Default)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timing Control - Only show after note is created */}
          {createdNoteId && <TimingControl noteId={createdNoteId} className="mb-6" />}

          {/* Manual Content Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Manual Notes
              </CardTitle>
              <CardDescription>
                Type your clinical notes directly or edit transcribed content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                aria-label="Manual notes"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your clinical notes here..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-emerald-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 dark:bg-gray-800 dark:text-emerald-100"
              />
            </CardContent>
          </Card>

          {(transcription || soapNote) && (
            <ClinicalNote
              title="Visit result · Draft for review"
              transcript={transcription || content}
              sourceLabel={transcription ? 'Transcript' : 'Visit notes'}
              soap={soapNote || { subjective: '', objective: '', assessment: '', plan: '' }}
              caption="Save the note to review, edit, approve, and export it."
            />
          )}
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
