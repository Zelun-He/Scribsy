'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Patient, Note } from '@/types';

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Patient profile page loaded with params:', params);
    console.log('Auth loading:', authLoading, 'User:', user);
    
    if (authLoading) {
      console.log('Still loading auth, waiting...');
      return;
    }
    
    if (!user) {
      console.log('No user found, redirecting to login');
      router.push('/login');
      return;
    }
    
    if (params.id) {
      console.log('Fetching data for patient ID:', params.id);
      fetchPatient(params.id as string);
      fetchPatientNotes(params.id as string);
    } else {
      console.log('No patient ID found in params');
      setError('No patient ID provided');
      setLoading(false);
    }
  }, [params.id, user, authLoading, router]);

  const fetchPatient = async (patientId: string) => {
    console.log('Fetching patient with ID:', patientId);
    try {
      const fetchedPatient = await apiClient.getPatient(parseInt(patientId));
      console.log('Fetched patient:', fetchedPatient);
      setPatient(fetchedPatient);
      setError('');
    } catch (err) {
      console.error('Error fetching patient:', err);
      setError(`Failed to fetch patient details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientNotes = async (patientId: string) => {
    console.log('Fetching notes for patient ID:', patientId);
    try {
      const fetchedNotes = await apiClient.getNotes({
        patient_id: parseInt(patientId),
        limit: 100 // Get more notes for patient history
      });
      console.log('Fetched notes:', fetchedNotes);
      setNotes(fetchedNotes);
    } catch (err) {
      console.error('Error fetching patient notes:', err);
      // Don't set error here, as patient details might still load
    } finally {
      setNotesLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'signed':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <Link href="/patients">
            <Button variant="ghost">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <p className="text-center text-gray-500 dark:text-gray-400">Patient not found</p>
          <Link href="/patients">
            <Button variant="ghost">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/patients">
              <Button variant="ghost">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Patients
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {patient.first_name} {patient.last_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Patient ID: #{patient.id} • {calculateAge(patient.date_of_birth)} years old
              </p>
            </div>
          </div>
          <Link href={`/notes/new?patient_id=${patient.id}`}>
            <Button>
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Details */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="w-5 h-5 mr-2" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Demographics */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Demographics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Born: {new Date(patient.date_of_birth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    {patient.phone_number && (
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{patient.phone_number}</span>
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{patient.email}</span>
                      </div>
                    )}
                    {!patient.phone_number && !patient.email && (
                      <span className="text-gray-400 italic">No contact information on file</span>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Address</h4>
                  <div className="space-y-2 text-sm">
                    {patient.address ? (
                      <div className="flex items-start gap-2">
                        <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="text-gray-600 dark:text-gray-400">
                          <div>{patient.address}</div>
                          {patient.city && patient.state && (
                            <div>{patient.city}, {patient.state} {patient.zip_code}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No address on file</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <DocumentTextIcon className="w-5 h-5 mr-2" />
                    Clinical Notes ({notes.length})
                  </CardTitle>
                  <Link href={`/notes/new?patient_id=${patient.id}`}>
                    <Button size="sm">
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      New Note
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  Complete medical record history for {patient.first_name} {patient.last_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                ) : notes.length > 0 ? (
                  <div className="space-y-4">
                    {notes
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((note) => (
                        <div
                          key={note.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                  Clinical Note #{note.id}
                                </h4>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(note.status)}`}>
                                  {note.status.replace('_', ' ').toLowerCase()}
                                </span>
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full">
                                  {note.note_type}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>{formatDate(note.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span>Visit #{note.visit_id}</span>
                                </div>
                              </div>
                              
                              {/* Note Preview */}
                              <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded p-3 mb-3">
                                <p className="line-clamp-3">
                                  {note.content.length > 200 
                                    ? `${note.content.substring(0, 200)}...` 
                                    : note.content}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <Link href={`/notes/${note.id}`}>
                                <Button variant="ghost" size="sm">
                                  <EyeIcon className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Link href={`/notes/${note.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <PencilIcon className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No clinical notes yet
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Start by creating the first clinical note for {patient.first_name}.
                    </p>
                    <Link href={`/notes/new?patient_id=${patient.id}`}>
                      <Button>
                        <DocumentTextIcon className="w-4 h-4 mr-2" />
                        Create First Note
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}