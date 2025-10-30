'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export const Fab: React.FC = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Hide FAB on login, register, and other public pages
  const hiddenPaths = ['/login', '/register', '/', '/auth/forgot-password', '/auth/reset-password'];
  const shouldShow = !hiddenPaths.some(path => pathname === path || pathname.startsWith(path)) && user;
  
  if (!shouldShow) {
    return null;
  }

  const Action = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      className="flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 shadow hover:shadow-md text-sm"
      onClick={() => { onClick(); setOpen(false); }}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      {label}
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 z-[70]">
      {open && (
        <div className="mb-3 flex flex-col items-end gap-2">
          <Action label="New SOAP" onClick={() => router.push('/notes/new?from_action=true')} />
          <Action label="Import PDF" onClick={() => router.push('/notes/new?import=pdf&from_action=true')} />
          <Action label="Schedule Appointment" onClick={() => router.push('/appointments/new')} />
        </div>
      )}
      <button
        aria-label="Create"
        onClick={() => setOpen(v => !v)}
        className="h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" className={`h-6 w-6 transition-transform ${open ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};



