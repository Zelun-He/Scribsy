'use client';

import React, { useEffect } from 'react';

interface DrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  side?: 'right' | 'left';
  widthClassName?: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onOpenChange, side = 'right', widthClassName = 'w-[420px]', children }) => {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onOpenChange]);

  return (
    <>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[90]" onClick={() => onOpenChange(false)} />
          <div className={`fixed top-0 ${side === 'right' ? 'right-0' : 'left-0'} h-full bg-white dark:bg-gray-900 shadow-2xl z-[91] ${widthClassName} animate-slide-in` }>
            {children}
          </div>
        </>
      )}
    </>
  );
};

// Simple CSS animation via tailwind layer (to be included in globals)

