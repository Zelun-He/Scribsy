'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import styles from './theme-toggle.module.css';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div role="group" aria-label="Color theme" className={`${styles.toggle} ${compact ? styles.compact : ''}`}>
      <button type="button" aria-label="Light mode" title="Light mode" aria-pressed={mounted ? theme === 'light' : true} disabled={!mounted} onClick={() => setTheme('light')}>
        <Sun size={16} aria-hidden="true" /><span>Light</span>
      </button>
      <button type="button" aria-label="Dark mode" title="Dark mode" aria-pressed={mounted && theme === 'dark'} disabled={!mounted} onClick={() => setTheme('dark')}>
        <Moon size={16} aria-hidden="true" /><span>Dark</span>
      </button>
    </div>
  );
}
