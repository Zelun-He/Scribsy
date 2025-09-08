'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeftIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Patient } from '@/types';

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (params.id) {
      fetchPatient(params.id as string);
    }
  }, [params.id, user, authLoading, router]);

  const fetchPatient = async (patientId: string) => {
    try {
      const fetchedPatient = await apiClient.getPatient(parseInt(patientId));
      setPatient(fetchedPatient);
      
      // Populate form fields
      setFirstName(fetchedPatient.first_name || '');
      setLastName(fetchedPatient.last_name || '');
      setDateOfBirth(fetchedPatient.date_of_birth || '');
      setPhoneNumber(fetchedPatient.phone_number || '');
      setEmail(fetchedPatient.email || '');
      setAddress(fetchedPatient.address || '');
      setCity(fetchedPatient.city || '');
      setState(fetchedPatient.state || '');
      setZipCode(fetchedPatient.zip_code || '');
      
      setError('');
    } catch (err) {
      setError(`Failed to fetch patient details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setError('');

    // Validate required fields
    console.log('Frontend: Form validation - firstName:', firstName, 'lastName:', lastName, 'dateOfBirth:', dateOfBirth);
    
    if (!firstName || !lastName || !dateOfBirth) {
      console.log('Frontend: Validation failed - missing required fields');
      setError('Please fill in all required fields: First Name, Last Name, and Date of Birth');
      setSaveLoading(false);
      return;
    }
    
    console.log('Frontend: Validation passed, proceeding with update');

    try {
      const patientData = {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth, // Always include DOB, never set to undefined
        phone_number: phoneNumber || undefined,
        email: email || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zip_code: zipCode || undefined,
      };

      console.log('Frontend: Submitting patient update with data:', patientData);
      console.log('Frontend: Patient ID:', params.id);
      console.log('Frontend: Date of Birth value:', dateOfBirth, typeof dateOfBirth);

      await apiClient.updatePatient(parseInt(params.id as string), patientData);
      console.log('Frontend: Update API call successful');
      router.push(`/patients/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient');
    } finally {
      setSaveLoading(false);
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

  if (error && !patient) {
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/patients/${params.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Edit Patient: {patient.first_name} {patient.last_name}
            </h1>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={saveLoading || !firstName || !lastName || !dateOfBirth}
            loading={saveLoading}
          >
            {saveLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PencilIcon className="w-5 h-5 mr-2" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Required patient demographics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    First Name *
                  </label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    Last Name *
                  </label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                  Date of Birth *
                </label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Phone number and email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>
                Patient's residential address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                  Street Address
                </label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    City
                  </label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    State
                  </label>
                  <Input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                    ZIP Code
                  </label>
                  <Input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}