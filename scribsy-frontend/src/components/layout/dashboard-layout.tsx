'use client';

import React from 'react';
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
    // Render nothing; auth provider will redirect unauthenticated users elsewhere
    return null;
  }

  // Sidebar and toggle are handled globally by SidebarFrame in the root layout
  return (
    <div className="min-h-screen bg-transparent">
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};