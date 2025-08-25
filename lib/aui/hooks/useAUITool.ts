'use client';

import { useState, useCallback, useRef } from 'react';
import type { AUITool, AUIContext } from '../index';

export interface UseAUIToolOptions {
  cache?: boolean;
  cacheTime?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useAUITool<TInput = any, TOutput = any>(
  tool: AUITool<TInput, TOutput>,
  options: UseAUIToolOptions = {}
) {
  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const cacheRef = useRef(new Map<string, { data: TOutput; timestamp: number }>());
  const contextRef = useRef<AUIContext>({
    cache: new Map(),
    fetch: typeof window !== 'undefined' ? window.fetch.bind(window) : fetch,
  });

  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);

    try {
      // Check cache if enabled
      if (options.cache) {
        const cacheKey = JSON.stringify(input);
        const cached = cacheRef.current.get(cacheKey);
        
        if (cached) {
          const age = Date.now() - cached.timestamp;
          const maxAge = options.cacheTime || 60000; // Default 1 minute
          
          if (age < maxAge) {
            setData(cached.data);
            setLoading(false);
            options.onSuccess?.(cached.data);
            return cached.data;
          }
        }
      }

      // Execute the tool
      const result = await tool.run(input, contextRef.current);
      
      // Cache the result if caching is enabled
      if (options.cache) {
        const cacheKey = JSON.stringify(input);
        cacheRef.current.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }

      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [tool, options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    contextRef.current.cache.clear();
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    clearCache,
  };
}

// Hook for executing tools by name
export function useAUI() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});
  const [data, setData] = useState<Record<string, any>>({});
  
  const contextRef = useRef<AUIContext>({
    cache: new Map(),
    fetch: typeof window !== 'undefined' ? window.fetch.bind(window) : fetch,
  });

  const execute = useCallback(async (toolName: string, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    setErrors(prev => ({ ...prev, [toolName]: null }));

    try {
      const response = await fetch('/api/aui/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, input }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Tool execution failed');
      }

      const result = await response.json();
      setData(prev => ({ ...prev, [toolName]: result.data }));
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setErrors(prev => ({ ...prev, [toolName]: error }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  }, []);

  return {
    execute,
    loading,
    errors,
    data,
    context: contextRef.current,
  };
}