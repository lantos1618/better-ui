'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect, useRef } from 'react';
import { Tool, AUIContext, aui } from './lantos-ultra';

interface AUIProviderProps {
  children: ReactNode;
  initialContext?: Partial<AUIContext>;
  serverUrl?: string;
}

interface AUIContextValue {
  context: AUIContext;
  executeTool: <TInput = any, TOutput = any>(
    toolOrName: Tool<TInput, TOutput> | string,
    input: TInput
  ) => Promise<TOutput>;
  loading: Record<string, boolean>;
  errors: Record<string, Error | null>;
  results: Record<string, any>;
  clearError: (toolName: string) => void;
  clearResult: (toolName: string) => void;
}

const AUIReactContext = createContext<AUIContextValue | undefined>(undefined);

export function AUIProvider({ children, initialContext, serverUrl = '/api/aui/execute' }: AUIProviderProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});
  const [results, setResults] = useState<Record<string, any>>({});

  const context = useMemo(() => {
    return aui.createContext({
      ...initialContext,
      fetch: async (url: string, options?: RequestInit) => {
        const finalUrl = url.startsWith('/') ? `${serverUrl}${url}` : url;
        return fetch(finalUrl, options);
      }
    });
  }, [initialContext, serverUrl]);

  const executeTool = useCallback(async <TInput = any, TOutput = any>(
    toolOrName: Tool<TInput, TOutput> | string,
    input: TInput
  ): Promise<TOutput> => {
    const toolName = typeof toolOrName === 'string' ? toolOrName : toolOrName.name;
    const tool = typeof toolOrName === 'string' ? aui.get(toolOrName) : toolOrName;

    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    setLoading(prev => ({ ...prev, [toolName]: true }));
    setErrors(prev => ({ ...prev, [toolName]: null }));

    try {
      const result = await tool.run(input, context);
      setResults(prev => ({ ...prev, [toolName]: result }));
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setErrors(prev => ({ ...prev, [toolName]: err }));
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  }, [context]);

  const clearError = useCallback((toolName: string) => {
    setErrors(prev => ({ ...prev, [toolName]: null }));
  }, []);

  const clearResult = useCallback((toolName: string) => {
    setResults(prev => ({ ...prev, [toolName]: undefined }));
  }, []);

  const value = useMemo(() => ({
    context,
    executeTool,
    loading,
    errors,
    results,
    clearError,
    clearResult
  }), [context, executeTool, loading, errors, results, clearError, clearResult]);

  return (
    <AUIReactContext.Provider value={value}>
      {children}
    </AUIReactContext.Provider>
  );
}

export function useAUI() {
  const context = useContext(AUIReactContext);
  if (!context) {
    throw new Error('useAUI must be used within an AUIProvider');
  }
  return context;
}

export function useToolExecution<TInput = any, TOutput = any>(
  toolOrName: Tool<TInput, TOutput> | string
) {
  const { executeTool, loading, errors, results, clearError, clearResult } = useAUI();
  const toolName = typeof toolOrName === 'string' ? toolOrName : toolOrName.name;

  const execute = useCallback((input: TInput) => {
    return executeTool(toolOrName, input);
  }, [executeTool, toolOrName]);

  const reset = useCallback(() => {
    clearError(toolName);
    clearResult(toolName);
  }, [clearError, clearResult, toolName]);

  return {
    execute,
    loading: loading[toolName] || false,
    error: errors[toolName] || null,
    data: results[toolName] as TOutput | undefined,
    reset
  };
}

export function useToolContext(initial?: Partial<AUIContext>): AUIContext {
  const cacheRef = useRef(new Map<string, any>());
  
  return {
    cache: cacheRef.current,
    fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
    ...initial,
  };
}

export type { AUIProviderProps };