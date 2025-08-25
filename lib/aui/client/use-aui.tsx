'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AUITool, AUIContext } from '../index';

export interface UseAUIOptions {
  cache?: boolean;
  offline?: boolean;
  optimistic?: boolean;
}

export interface UseAUIResult<TInput = any, TOutput = any> {
  execute: (input: TInput) => Promise<TOutput>;
  data: TOutput | null;
  error: Error | null;
  loading: boolean;
  reset: () => void;
}

// Client-side hook for executing AUI tools
export function useAUI<TInput = any, TOutput = any>(
  tool: AUITool<TInput, TOutput> | string,
  options: UseAUIOptions = {}
): UseAUIResult<TInput, TOutput> {
  const [data, setData] = useState<TOutput | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(new Map<string, TOutput>());

  const execute = useCallback(async (input: TInput): Promise<TOutput> => {
    setLoading(true);
    setError(null);

    try {
      const toolName = typeof tool === 'string' ? tool : tool.name;
      const cacheKey = options.cache ? `${toolName}:${JSON.stringify(input)}` : null;

      // Check cache first
      if (cacheKey && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        setData(cached);
        setLoading(false);
        return cached;
      }

      // Create client context
      const ctx: AUIContext = {
        cache: cacheRef.current,
        fetch: async (url: string, opts?: any) => {
          const response = await fetch(url, {
            ...opts,
            headers: {
              'Content-Type': 'application/json',
              ...opts?.headers,
            },
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        },
      };

      let result: TOutput;

      // If tool has client execution, use it
      if (typeof tool !== 'string' && tool.clientHandler) {
        result = await tool.run(input, ctx);
      } else {
        // Otherwise, call the server API
        const response = await fetch('/api/aui/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: typeof tool === 'string' ? tool : tool.name,
            input,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to execute tool');
        }

        const { data: responseData } = await response.json();
        result = responseData;
      }

      // Cache the result
      if (cacheKey) {
        cacheRef.current.set(cacheKey, result);
      }

      setData(result);
      setLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setLoading(false);
      throw error;
    }
  }, [tool, options.cache]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { execute, data, error, loading, reset };
}

// Hook for rendering tool results
export function useAUIRender<TInput = any, TOutput = any>(
  tool: AUITool<TInput, TOutput>,
  data: TOutput | null,
  input?: TInput
) {
  if (!data) return null;
  return tool.renderer ? tool.renderer({ data, input }) : null;
}

// Hook for batch tool execution
export function useAUIBatch<T extends Record<string, AUITool>>(
  tools: T,
  options: UseAUIOptions = {}
): {
  execute: <K extends keyof T>(
    name: K,
    input: Parameters<T[K]['run']>[0]
  ) => Promise<ReturnType<T[K]['run']>>;
  results: Map<keyof T, any>;
  errors: Map<keyof T, Error>;
  loading: Map<keyof T, boolean>;
  reset: () => void;
} {
  const [results] = useState(new Map<keyof T, any>());
  const [errors] = useState(new Map<keyof T, Error>());
  const [loading] = useState(new Map<keyof T, boolean>());
  const [, forceUpdate] = useState({});

  const execute = useCallback(async <K extends keyof T>(
    name: K,
    input: Parameters<T[K]['run']>[0]
  ): Promise<ReturnType<T[K]['run']>> => {
    loading.set(name, true);
    errors.delete(name);
    forceUpdate({});

    try {
      const tool = tools[name];
      const ctx: AUIContext = {
        cache: new Map(),
        fetch: globalThis.fetch.bind(globalThis),
      };

      const result = await tool.run(input, ctx);
      results.set(name, result);
      loading.set(name, false);
      forceUpdate({});
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      errors.set(name, err);
      loading.set(name, false);
      forceUpdate({});
      throw err;
    }
  }, [tools, results, errors, loading]);

  const reset = useCallback(() => {
    results.clear();
    errors.clear();
    loading.clear();
    forceUpdate({});
  }, [results, errors, loading]);

  return { execute, results, errors, loading, reset };
}