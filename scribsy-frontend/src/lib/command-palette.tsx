'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useTheme } from 'next-themes';

export const CommandPalette: React.FC = () => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const items = useMemo(() => ([
    { value: 'new-note', label: 'New note', action: () => router.push('/notes/new') },
    { value: 'find-patient', label: 'Find patient', action: () => router.push('/patients') },
    { value: 'start-dictation', label: 'Start dictation', action: () => router.push('/notes/new?start_dictation=1') },
    { value: 'toggle-theme', label: 'Toggle dark mode', action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
  ]), [router, setTheme, theme]);

  const filtered = items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-lg shadow-xl border border-stone-200 dark:border-gray-800">
        <Command>
          <div className="p-3 border-b border-stone-200 dark:border-gray-800">
            <CommandInput placeholder="Type a command..." onChange={(e) => setQuery(e.target.value)} />
          </div>
          <CommandList>
            {filtered.length === 0 && (
              <CommandEmpty>No results</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map(item => (
                <CommandItem key={item.value} value={item.value} onSelect={() => { item.action(); setOpen(false); }}>
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
};


