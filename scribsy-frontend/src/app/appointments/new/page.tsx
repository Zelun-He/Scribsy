'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { Patient } from '@/types';
import { useToast } from '@/lib/toast';
import { formatDateOnly } from '@/utils/date';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AnimatedActionButton } from '@/components/ui/animated-action';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import styles from './appointment.module.css';

export default function NewAppointmentPage() {
  const { user } = useAuth();
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
    if (loading) return;
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

    // Validate before creating a patient, so invalid dates have no side effects.
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      setError('Appointment must be scheduled in the future');
      setLoading(false);
      return;
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
        setSelectedPatientId(finalPatientId);
        setPatients(previous => [...previous, newPatient]);
        setShowNewPatientForm(false);
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

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Schedule / New appointment</p>
          <h1>Schedule an appointment</h1>
          <p>Choose a patient and set the details for their next visit.</p>
        </header>
        <form onSubmit={handleSubmit} className={styles.card} aria-label="New appointment">
          {error && <div className={styles.error} role="alert">{error}</div>}
          <fieldset disabled={loading} className={styles.fields}>
            <section className={styles.section} aria-labelledby="patient-section-title">
              <div className={styles.sectionHeader}><h2 id="patient-section-title">Patient</h2><p>Select an existing patient or add someone new.</p></div>
              {!showNewPatientForm ? <div className={styles.patientChoice}>
                <label className={styles.field} htmlFor="patient">Patient <span>*</span></label>
                <select id="patient" value={selectedPatientId} onChange={event => setSelectedPatientId(event.target.value)} required>
                  <option value="">Select a patient…</option>
                  {patients.map(patient => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name} (DOB: {formatDateOnly(patient.date_of_birth)})</option>)}
                </select>
                <button type="button" className={styles.secondaryButton} onClick={() => { setShowNewPatientForm(true); setSelectedPatientId(''); }}>+ Add new patient</button>
              </div> : <div className={styles.newPatient}>
                <div className={styles.newPatientHeader}><h3>New patient details</h3><button type="button" onClick={() => setShowNewPatientForm(false)}>Use an existing patient</button></div>
                <div className={styles.grid}>
                  <label className={styles.field}>First name <span>*</span><input value={newPatientFirstName} onChange={event => setNewPatientFirstName(event.target.value)} required /></label>
                  <label className={styles.field}>Last name <span>*</span><input value={newPatientLastName} onChange={event => setNewPatientLastName(event.target.value)} required /></label>
                  <label className={styles.field}>Date of birth <span>*</span><input type="date" value={newPatientDOB} onChange={event => setNewPatientDOB(event.target.value)} required /></label>
                  <label className={styles.field}>Phone number<input type="tel" value={newPatientPhone} onChange={event => setNewPatientPhone(event.target.value)} /></label>
                  <label className={styles.field}>Email<input type="email" value={newPatientEmail} onChange={event => setNewPatientEmail(event.target.value)} /></label>
                  <label className={styles.field}>Address<input value={newPatientAddress} onChange={event => setNewPatientAddress(event.target.value)} /></label>
                </div>
              </div>}
            </section>
            <section className={styles.section} aria-labelledby="appointment-section-title">
              <div className={styles.sectionHeader}><h2 id="appointment-section-title">Appointment details</h2><p>All times are shown in your device’s local time.</p></div>
              <div className={styles.details}>
                <label className={styles.field}>Title <small>Optional</small><input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g., Follow-up, Consultation, Check-up" /></label>
                <div className={styles.grid}>
                  <label className={styles.field}>Date <span>*</span><input type="date" value={scheduledDate} min={today} onChange={event => setScheduledDate(event.target.value)} required /></label>
                  <label className={styles.field}>Time <span>*</span><input type="time" value={scheduledTime} onChange={event => setScheduledTime(event.target.value)} required /></label>
                </div>
                <label className={styles.field}>Reminder<select aria-label="Reminder" value={notifyBeforeMinutes} onChange={event => setNotifyBeforeMinutes(Number(event.target.value))}>
                  <option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option><option value={120}>2 hours before</option><option value={1440}>1 day before</option>
                </select></label>
                <label className={styles.field}>Notes <small>Optional</small><textarea value={note} onChange={event => setNote(event.target.value)} rows={4} placeholder="Additional notes about the appointment…" /></label>
              </div>
            </section>
            <footer className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={handleCancel}>Cancel</button>
              <AnimatedActionButton type="submit" label="Create appointment" loadingLabel="Creating appointment…" loading={loading} icon={<CalendarDaysIcon />} className={styles.createButton} />
            </footer>
          </fieldset>
        </form>
      </div>
    </DashboardLayout>
  );
}
