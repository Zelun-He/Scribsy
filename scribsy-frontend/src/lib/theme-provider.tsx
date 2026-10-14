'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} themes={['light', 'dark']} storageKey="scribsy-color-theme" {...props}>
      {children}
    </NextThemesProvider>
  );
}
