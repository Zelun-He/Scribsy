'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { Patient, Appointment } from '@/types';
import { useToast } from '@/lib/toast';
import { formatDateOnly } from '@/utils/date';

export default function NewAppointmentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { show } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notifyBeforeMinutes, setNotifyBeforeMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New patient form fields
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatientFirstName, setNewPatientFirstName] = useState('');
  const [newPatientLastName, setNewPatientLastName] = useState('');
  const [newPatientDOB, setNewPatientDOB] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientAddress, setNewPatientAddress] = useState('');

  // Load patients on component mount
  useEffect(() => {
    const loadPatients = async () => {
      if (!user) return;
      try {
        const patientsData = await apiClient.getPatients();
        setPatients(patientsData);
      } catch (err) {
        console.error('Failed to load patients:', err);
        setError('Failed to load patients');
      }
    };

    loadPatients();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    if ((!selectedPatientId && !showNewPatientForm) || !scheduledDate || !scheduledTime) {
      setError('Please fill in all required fields: Patient, Date, and Time');
      setLoading(false);
      return;
    }

    // If creating new patient, validate patient fields
    if (showNewPatientForm) {
      if (!newPatientFirstName.trim() || !newPatientLastName.trim() || !newPatientDOB) {
        setError('Please fill in all required patient fields: First Name, Last Name, and Date of Birth');
        setLoading(false);
        return;
      }
    }

    try {
      let finalPatientId = selectedPatientId;

      // Create new patient if needed
      if (showNewPatientForm) {
        const newPatient = await apiClient.createPatient({
          first_name: newPatientFirstName.trim(),
          last_name: newPatientLastName.trim(),
          date_of_birth: newPatientDOB,
          ...(newPatientPhone.trim() && { phone_number: newPatientPhone.trim() }),
          ...(newPatientEmail.trim() && { email: newPatientEmail.trim() }),
          ...(newPatientAddress.trim() && { address: newPatientAddress.trim() })
        });
        finalPatientId = newPatient.id.toString();
      }

      // Combine date and time into ISO string
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      
      // Validate that the appointment is in the future
      if (scheduledAt <= new Date()) {
        setError('Appointment must be scheduled in the future');
        setLoading(false);
        return;
      }

      const appointmentData = {
        patient_id: parseInt(finalPatientId),
        scheduled_at: scheduledAt.toISOString(),
        title: title.trim() || 'Appointment',
        note: note.trim(),
        notify_before_minutes: notifyBeforeMinutes,
      };

      await apiClient.createAppointment(appointmentData);
      
      show('Appointment created successfully');
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to create appointment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Schedule New Appointment
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Create a new appointment for a patient
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Patient Selection */}
            <div>
              <label htmlFor="patient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Patient <span className="text-red-500">*</span>
              </label>
              
              {!showNewPatientForm ? (
                <div className="space-y-3">
                  <select
                    id="patient"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a patient...</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} (DOB: {formatDateOnly(patient.date_of_birth)})
                      </option>
                    ))}
                  </select>
                  
                  <div className="flex items-center justify-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPatientForm(true);
                      setSelectedPatientId('');
                    }}
                    className="w-full px-4 py-2 border border-emerald-600 text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    + Add New Patient
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-4 border border-emerald-200 dark:border-emerald-800 rounded-md bg-emerald-50 dark:bg-emerald-900/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-200">New Patient Information</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewPatientForm(false);
                        setNewPatientFirstName('');
                        setNewPatientLastName('');
                        setNewPatientDOB('');
                        setNewPatientPhone('');
                        setNewPatientEmail('');
                        setNewPatientAddress('');
                      }}
                      className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        value={newPatientFirstName}
                        onChange={(e) => setNewPatientFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={newPatientLastName}
                        onChange={(e) => setNewPatientLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="dob" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="dob"
                        value={newPatientDOB}
                        onChange={(e) => setNewPatientDOB(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={newPatientPhone}
                        onChange={(e) => setNewPatientPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={newPatientEmail}
                        onChange={(e) => setNewPatientEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="address" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        id="address"
                        value={newPatientAddress}
                        onChange={(e) => setNewPatientAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Follow-up, Consultation, Check-up"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Notification */}
            <div>
              <label htmlFor="notify" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Remind Before (minutes)
              </label>
              <select
                id="notify"
                value={notifyBeforeMinutes}
                onChange={(e) => setNotifyBeforeMinutes(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={1440}>1 day</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Additional notes about the appointment..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
