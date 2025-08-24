'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Tool, ToolContext } from '../lantos-aui';
import { useAUIContext } from './provider';

export interface UseToolOptions {
  cache?: boolean;
  debounce?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface UseToolResult<TInput, TOutput> {
  execute: (input: TInput) => Promise<TOutput>;
  loading: boolean;
  data: TOutput | null;
  error: Error | null;
  reset: () => void;
  render: (() => React.ReactElement | null) | null;
}

export function useAUITool<TInput, TOutput>(
  tool: Tool<TInput, TOutput>,
  options: UseToolOptions = {}
): UseToolResult<TInput, TOutput> {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TOutput | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const context = useAUIContext();
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeInternal = async (input: TInput): Promise<TOutput> => {
    setLoading(true);
    setError(null);

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Check cache if enabled
      if (options.cache) {
        const cacheKey = `${tool.name}:${JSON.stringify(input)}`;
        const cached = context.cache.get(cacheKey);
        if (cached) {
          setData(cached);
          options.onSuccess?.(cached);
          return cached;
        }
      }

      // Execute tool
      const result = await tool.run(input, context);
      
      // Cache result if enabled
      if (options.cache) {
        const cacheKey = `${tool.name}:${JSON.stringify(input)}`;
        context.cache.set(cacheKey, result);
      }

      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        setError(error);
        options.onError?.(error);
      }
      throw error;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const execute = useCallback(async (input: TInput) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Handle debounce
    if (options.debounce) {
      return new Promise<TOutput>((resolve, reject) => {
        debounceTimerRef.current = setTimeout(async () => {
          try {
            const result = await executeInternal(input);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }, options.debounce);
      });
    }

    return executeInternal(input);
  }, [tool, context, options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    execute,
    loading,
    data,
    error,
    reset,
    render: data ? () => tool.renderResult(data) : null,
  };
}

// Hook for managing multiple tools
export interface UseAUIResult {
  executeTool: (name: string, input: any) => Promise<any>;
  getResult: (name: string) => any;
  getError: (name: string) => Error | undefined;
  isLoading: (name: string) => boolean;
  clearResult: (name: string) => void;
  clearAll: () => void;
  results: Record<string, any>;
  errors: Record<string, Error>;
  loading: string[];
}

export function useAUI(): UseAUIResult {
  const [results, setResults] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  const context = useAUIContext();

  const executeTool = useCallback(async (toolName: string, input: any) => {
    setLoading(prev => new Set(prev).add(toolName));
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(toolName);
      return next;
    });

    try {
      const response = await context.fetch('/execute', {
        method: 'POST',
        body: JSON.stringify({ tool: toolName, input }),
      });

      setResults(prev => new Map(prev).set(toolName, response.data));
      return response.data;
    } catch (error) {
      setErrors(prev => new Map(prev).set(toolName, error as Error));
      throw error;
    } finally {
      setLoading(prev => {
        const next = new Set(prev);
        next.delete(toolName);
        return next;
      });
    }
  }, [context]);

  const getResult = useCallback((toolName: string) => {
    return results.get(toolName);
  }, [results]);

  const getError = useCallback((toolName: string) => {
    return errors.get(toolName);
  }, [errors]);

  const isLoading = useCallback((toolName: string) => {
    return loading.has(toolName);
  }, [loading]);

  const clearResult = useCallback((toolName: string) => {
    setResults(prev => {
      const next = new Map(prev);
      next.delete(toolName);
      return next;
    });
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(toolName);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setResults(new Map());
    setErrors(new Map());
    setLoading(new Set());
  }, []);

  return {
    executeTool,
    getResult,
    getError,
    isLoading,
    clearResult,
    clearAll,
    results: Object.fromEntries(results),
    errors: Object.fromEntries(errors),
    loading: Array.from(loading),
  };
}