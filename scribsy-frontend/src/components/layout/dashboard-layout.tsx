'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { useAuth } from '@/lib/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Access Denied</h2>
          <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-transparent">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-transparent">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};