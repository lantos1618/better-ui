'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { AUIContext } from './lantos-concise';

const AUIContextProvider = createContext<AUIContext | null>(null);

export function AUIProvider({ children }: { children: React.ReactNode }) {
  const context = useMemo<AUIContext>(() => {
    const cache = new Map<string, any>();
    
    // Enhanced fetch with automatic JSON parsing
    const enhancedFetch: typeof fetch = async (input, init) => {
      const response = await fetch(input, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
      
      // Auto-parse JSON responses
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        return {
          ...response,
          json: async () => data,
        } as Response;
      }
      
      return response;
    };
    
    return {
      cache,
      fetch: enhancedFetch,
      user: null, // Can be populated from auth
      session: null, // Can be populated from session
    };
  }, []);

  return (
    <AUIContextProvider.Provider value={context}>
      {children}
    </AUIContextProvider.Provider>
  );
}

export function useAUI() {
  const context = useContext(AUIContextProvider);
  if (!context) {
    throw new Error('useAUI must be used within AUIProvider');
  }
  return context;
}

// Hook for running tools with context
export function useAUITool<I, O>(tool: any) {
  const context = useAUI();
  
  const run = React.useCallback(
    async (input: I): Promise<O> => {
      return await tool.run(input, context);
    },
    [tool, context]
  );

  return { run, context };
}