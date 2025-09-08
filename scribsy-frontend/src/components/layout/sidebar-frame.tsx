'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSidebar, SidebarTrigger, SidebarFloatingTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

export const SidebarFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
  // Public pages that should not show the sidebar
  const publicPages = ['/login', '/register', '/'];
  const isPublicPage = publicPages.includes(pathname);
  
  // If it's a public page or the user is not authenticated (or still loading), render without sidebar
  if (isPublicPage || loading || !user) {
    return <>{children}</>;
  }
  
  // Render with sidebar for authenticated pages
  return (
    <div className="flex h-screen">
      {/* Sidebar hidden when collapsed by component logic */}
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Floating trigger when sidebar is collapsed */}
        {collapsed && <SidebarFloatingTrigger />}
        <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--background-pattern)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};


