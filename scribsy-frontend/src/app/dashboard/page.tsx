'use client';

import { useAuth } from '@/lib/auth';
import AuthenticatedDashboard from './AuthenticatedDashboard';
import ShowcaseDashboard from './ShowcaseDashboard';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#f4f6f7]" aria-label="Loading dashboard" />;
  return user ? <AuthenticatedDashboard /> : <ShowcaseDashboard />;
}
