'use client';

import React from 'react';

export interface ThemeProviderProps {
  /** Theme name — sets data-theme attribute. Default: 'dark' */
  theme?: string;
  /** Override individual CSS variables */
  variables?: Record<string, string>;
  /** Additional CSS class */
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps children with a themed container.
 * Sets `data-theme` for CSS variable scoping and applies inline variable overrides.
 */
export function ThemeProvider({
  theme = 'dark',
  variables,
  className,
  children,
}: ThemeProviderProps) {
  return (
    <div data-theme={theme} className={className} style={variables as React.CSSProperties}>
      {children}
    </div>
  );
}
