'use client';

import React from 'react';

export function Command({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}

export function CommandInput({ placeholder, className = '', onChange }: { placeholder?: string; className?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <input placeholder={placeholder} className={`w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${className}`} onChange={onChange} />;
}

export function CommandList({ children }: { children: React.ReactNode }) {
  return <div className="max-h-64 overflow-y-auto">{children}</div>;
}

export function CommandEmpty({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-6 text-sm text-stone-500 dark:text-gray-400">{children}</div>;
}

export function CommandGroup({ children }: { children: React.ReactNode }) {
  return <div className="py-1">{children}</div>;
}

export function CommandItem({ value, onSelect, children }: { value: string; onSelect?: (value: string) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-emerald-50 dark:hover:bg-[#1A1A1A]"
      onClick={() => onSelect?.(value)}
    >
      {children}
    </button>
  );
}


