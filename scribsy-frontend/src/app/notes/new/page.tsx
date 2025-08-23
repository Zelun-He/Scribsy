'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MicrophoneIcon, 
  StopIcon, 
  PlayIcon, 
  PauseIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  SparklesIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Patient } from '@/types';

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

function NewNotePageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [content, setContent] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [visitId, setVisitId] = useState('');
  const [noteType, setNoteType] = useState('');
  const [status, setStatus] = useState('pending_review'); // Always pending review for new notes
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Fetch patients on component mount and handle URL params
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const fetchedPatients = await apiClient.getPatients();
        setPatients(fetchedPatients);
        
        // Check if patient_id is provided in URL params
        const patientIdParam = searchParams.get('patient_id');
        if (patientIdParam) {
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

  // Update selected patient when patient ID changes
  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find(p => p.id.toString() === selectedPatientId);
      setSelectedPatient(patient || null);
    } else {
      setSelectedPatient(null);
    }
  }, [selectedPatientId, patients]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        
        setAudioFile(file);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    }
  };

  const transcribeAudio = async () => {
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

      console.log('Transcription received:', response.transcript);
      setTranscription(response.transcript);

      // Handle the summary response - convert dictionary to SOAPNote object
      if (response.summary) {
        console.log('Summary received:', response.summary);
        // Convert the dictionary response to SOAPNote object
        const soapNoteData = response.summary as any;
        if (soapNoteData.subjective && soapNoteData.objective && soapNoteData.assessment && soapNoteData.plan) {
          setSoapNote({
            subjective: soapNoteData.subjective,
            objective: soapNoteData.objective,
            assessment: soapNoteData.assessment,
            plan: soapNoteData.plan
          });
        } else {
          console.log('Invalid SOAP note structure:', soapNoteData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        auto_transcribe: !!audioFile,
        auto_summarize: !!audioFile,
        client_timezone: clientTimezone,
        client_timestamp: clientTimestamp,
        ...(audioFile && { audio_file: audioFile })
      };

      await apiClient.createNote(noteData);
      
      router.push('/notes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-purple-100">
            Create New Note
          </h1>
                            <Button
                    onClick={handleSubmit}
                    disabled={loading || (!content && !transcription) || (!selectedPatientId && !(patientFirstName && patientLastName && patientDOB)) || !noteType}
                    loading={loading}
                  >
            {loading ? 'Saving...' : 'Save Note'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
                    Patient *
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 dark:border-purple-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-purple-500 bg-gray-50 dark:bg-gray-800 dark:text-purple-100"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
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
                        DOB: {new Date(selectedPatient.date_of_birth).toLocaleDateString()} 
                        ({new Date().getFullYear() - new Date(selectedPatient.date_of_birth).getFullYear()} years)
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
                    Note Type *
                  </label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-purple-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-purple-500 dark:bg-gray-800 dark:text-purple-100"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
                    Status
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-purple-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Pending Review (Default)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audio Recording Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MicrophoneIcon className="w-5 h-5 mr-2" />
                Audio Recording
              </CardTitle>
              <CardDescription>
                Record audio or upload an audio file for transcription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex gap-2">
                  {!isRecording ? (
                    <Button
                      type="button"
                      onClick={startRecording}
                      variant="secondary"
                      className="flex items-center"
                    >
                      <MicrophoneIcon className="w-4 h-4 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={stopRecording}
                      variant="destructive"
                      className="flex items-center"
                    >
                      <StopIcon className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                </div>

                <div className="flex items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">or</span>
                  <div className="flex items-center">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => document.getElementById('audio-upload')?.click()}
                    >
                      <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                      Upload Audio
                    </Button>
                    <input
                      id="audio-upload"
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {audioUrl && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Audio Preview
                    </span>
                    <div className="flex gap-2">
                      {!isPlaying ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={playAudio}
                        >
                          <PlayIcon className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={pauseAudio}
                        >
                          <PauseIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full"
                    controls
                  />
                  <Button
                    type="button"
                    onClick={transcribeAudio}
                    disabled={isTranscribing}
                    loading={isTranscribing}
                    className="w-full mt-4"
                  >
                    {isTranscribing ? 'Transcribing...' : 'Transcribe & Generate SOAP Note'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

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
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your clinical notes here..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-purple-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-purple-500 dark:bg-gray-800 dark:text-purple-100"
              />
            </CardContent>
          </Card>

          {/* Transcription Results */}
          {transcription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  Transcription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-purple-300 whitespace-pre-wrap">
                    {transcription}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SOAP Note Results */}
          {soapNote && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Generated SOAP Note
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-purple-700 dark:text-purple-300">Subjective:</span> {soapNote.subjective}</div>
                    <div><span className="font-semibold text-purple-700 dark:text-purple-300">Objective:</span> {soapNote.objective}</div>
                    <div><span className="font-semibold text-purple-700 dark:text-purple-300">Assessment:</span> {soapNote.assessment}</div>
                    <div><span className="font-semibold text-purple-700 dark:text-purple-300">Plan:</span> {soapNote.plan}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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