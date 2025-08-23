'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  UserPlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { Patient } from '@/types';

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const fetchedPatients = await apiClient.getPatients();
      setPatients(fetchedPatients);
      setError('');
    } catch {
      setError('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = useCallback(() => {
    let filtered = patients;

    if (searchQuery) {
      filtered = patients.filter(patient =>
        patient.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone_number?.includes(searchQuery)
      );
    }

    setFilteredPatients(filtered);
  }, [patients, searchQuery]);

  useEffect(() => {
    filterPatients();
  }, [patients, searchQuery, filterPatients]);

  const deletePatient = async (patientId: number) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;

    setDeleteLoading(patientId.toString());
    try {
      await apiClient.deletePatient(patientId);
      setPatients(patients.filter(patient => patient.id !== patientId));
    } catch {
      setError('Failed to delete patient');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Patient Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage patient information and demographics
            </p>
          </div>
          <Link href="/patients/new">
            <Button>
              <UserPlusIcon className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Search */}
        <Card>
          <CardContent className="py-6">
            <div className="flex justify-center pt-8">
              <div className="w-full max-w-md relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search patients by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        {filteredPatients.length > 0 ? (
          <div className="grid gap-6">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/patients/${patient.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl hover:text-emerald-600 transition-colors">
                        {patient.first_name} {patient.last_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Patient ID: #{patient.id}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm" title="View Profile & Notes">
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/patients/${patient.id}/edit`}>
                        <Button variant="ghost" size="sm" title="Edit Patient">
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deletePatient(patient.id);
                        }}
                        disabled={deleteLoading === patient.id.toString()}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleteLoading === patient.id.toString() ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Demographics */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        Demographics
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            DOB: {formatDate(patient.date_of_birth)} ({calculateAge(patient.date_of_birth)} years old)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        Contact Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        {patient.phone_number && (
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {patient.phone_number}
                            </span>
                          </div>
                        )}
                        {patient.email && (
                          <div className="flex items-center gap-2">
                            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {patient.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        Address
                      </h4>
                      <div className="space-y-2 text-sm">
                        {patient.address && (
                          <div className="flex items-start gap-2">
                            <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="text-gray-600 dark:text-gray-400">
                              <div>{patient.address}</div>
                              {patient.city && patient.state && (
                                <div>{patient.city}, {patient.state} {patient.zip_code}</div>
                              )}
                            </div>
                          </div>
                        )}
                        {!patient.address && (
                          <span className="text-gray-400 italic">No address on file</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-20">
              <div className="pt-16">
                <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {searchQuery ? 'No patients found' : 'No patients yet'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery 
                    ? 'Try adjusting your search query.' 
                    : 'Get started by adding your first patient.'
                  }
                </p>
                <div className="mt-6">
                  <Link href="/patients/new">
                    <Button>
                      <UserPlusIcon className="w-4 h-4 mr-2" />
                      Add Patient
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 