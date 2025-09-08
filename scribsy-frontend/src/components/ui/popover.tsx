'use client';

import React, { createContext, useContext, useRef } from 'react';

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

export function Popover({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  return (
    <PopoverContext.Provider value={{ open, setOpen: onOpenChange }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error('PopoverTrigger must be used within Popover');
  const { open, setOpen } = ctx;
  if (asChild) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e);
        setOpen(!open);
      },
      'aria-expanded': open,
    });
  }
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className="inline-flex"
    >
      {children}
    </button>
  );
}

export function PopoverContent({ className = '', align = 'start', children }: { className?: string; align?: 'start' | 'end'; children: React.ReactNode }) {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error('PopoverContent must be used within Popover');
  const { open, setOpen } = ctx;
  const contentRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 mt-2 min-w-[12rem] ${align === 'end' ? 'right-0' : 'left-0'} ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      {children}
    </div>
  );
}


