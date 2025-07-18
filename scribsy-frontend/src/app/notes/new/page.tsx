'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  SparklesIcon 
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

export default function NewNotePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [patientId, setPatientId] = useState('');
  const [visitId, setVisitId] = useState('');
  const [noteType, setNoteType] = useState('');
  const [status, setStatus] = useState('draft');
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [soapNote, setSoapNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

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
    } catch (err) {
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
    if (!audioFile) return;
    
    setIsTranscribing(true);
    setError('');
    
    try {
      const response = await apiClient.transcribeAudio(audioFile);
      setTranscription(response.transcript);
      setSoapNote(response.summary ? JSON.stringify(response.summary) : '');
    } catch (err) {
      setError('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    if (!patientId || !visitId || !noteType || (!content && !transcription)) {
      setError('Please fill in all required fields: Patient ID, Visit ID, Note Type, and Content');
      setLoading(false);
      return;
    }

    try {
      const noteData: any = {
        patient_id: patientId,
        visit_id: visitId,
        note_type: noteType,
        content: content || transcription,
        status: status,
        auto_transcribe: !!audioFile,
        auto_summarize: !!audioFile
      };
      if (audioFile) {
        noteData.audio_file = audioFile;
      }

      const response = await apiClient.createNote(noteData);
      
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
            disabled={loading || (!content && !transcription) || !patientId || !visitId || !noteType}
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
                    Patient ID *
                  </label>
                  <Input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Enter patient ID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-purple-300 mb-1">
                    Visit ID *
                  </label>
                  <Input
                    type="text"
                    value={visitId}
                    onChange={(e) => setVisitId(e.target.value)}
                    placeholder="Enter visit ID"
                    required
                  />
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
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-purple-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-purple-500 dark:bg-gray-800 dark:text-purple-100"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending Review</option>
                    <option value="signed">Signed</option>
                    <option value="final">Final</option>
                  </select>
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
                  <pre className="text-sm text-gray-700 dark:text-purple-300 whitespace-pre-wrap font-mono">
                    {soapNote}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}