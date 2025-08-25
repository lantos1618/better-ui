'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { ToolContext } from '../lantos-aui';

interface AUIProviderProps {
  children: ReactNode;
  baseUrl?: string;
  cache?: Map<string, any>;
  user?: any;
  session?: any;
}

const AUIContext = createContext<ToolContext | null>(null);

export function AUIProvider({ 
  children, 
  baseUrl = '/api/aui/lantos',
  cache,
  user,
  session 
}: AUIProviderProps) {
  const context = useMemo<ToolContext>(() => ({
    cache: cache || new Map(),
    fetch: async (url: string, options?: RequestInit) => {
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    user,
    session,
  }), [baseUrl, cache, user, session]);

  return (
    <AUIContext.Provider value={context}>
      {children}
    </AUIContext.Provider>
  );
}

export function useAUIContext(): ToolContext {
  const context = useContext(AUIContext);
  if (!context) {
    // Return a default context if not within provider
    return {
      cache: new Map(),
      fetch: globalThis.fetch.bind(globalThis),
    };
  }
  return context;
}