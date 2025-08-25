'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { AUIContext as ToolContext } from '../index';

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
  baseUrl = '/api/aui',
  cache,
  user,
  session 
}: AUIProviderProps) {
  const context = useMemo<ToolContext>(() => ({
    cache: cache || new Map(),
    fetch: ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      return fetch(fullUrl, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
    }) as typeof fetch,
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