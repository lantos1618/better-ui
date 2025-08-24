'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Context, Tool } from './aui';

interface AUIContextValue {
  cache: Map<string, any>;
  fetch: typeof fetch;
  executeTool: <T = any>(toolName: string, input: T) => Promise<any>;
  user?: any;
  session?: any;
}

const AUIContext = createContext<AUIContextValue | undefined>(undefined);

export function AUIProvider({ 
  children,
  user,
  session 
}: { 
  children: React.ReactNode;
  user?: any;
  session?: any;
}) {
  const cache = useMemo(() => new Map<string, any>(), []);
  
  const executeTool = useCallback(async <T = any>(toolName: string, input: T) => {
    const response = await fetch(`/api/aui/tools/${toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  }, []);

  const value: AUIContextValue = {
    cache,
    fetch: globalThis.fetch,
    executeTool,
    user,
    session
  };

  return (
    <AUIContext.Provider value={value}>
      {children}
    </AUIContext.Provider>
  );
}

export function useAUI() {
  const context = useContext(AUIContext);
  if (!context) {
    throw new Error('useAUI must be used within AUIProvider');
  }
  return context;
}

export function useTool<TInput = any, TOutput = any>(
  tool: Tool<TInput, TOutput>
) {
  const context = useAUI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TOutput | null>(null);

  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const ctx: Context = {
        cache: context.cache,
        fetch: context.fetch,
        user: context.user,
        session: context.session
      };
      
      const result = await tool.run(input, ctx);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [tool, context]);

  const render = useCallback((customData?: TOutput) => {
    const renderData = customData ?? data;
    if (!renderData || !tool.renderFn) return null;
    return tool.renderFn({ data: renderData });
  }, [tool, data]);

  return {
    execute,
    render,
    loading,
    error,
    data
  };
}

export function useToolExecutor() {
  const context = useAUI();
  
  return useCallback(async <T = any>(toolName: string, input: T) => {
    return context.executeTool(toolName, input);
  }, [context]);
}