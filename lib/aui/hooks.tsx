'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Tool, ToolContext } from './index';

export interface UseToolOptions {
  context?: ToolContext;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  autoExecute?: boolean;
}

export function useTool<TInput = any, TOutput = any>(
  tool: Tool<TInput, TOutput>,
  options: UseToolOptions = {}
) {
  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);


  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await tool.run(input, options.context);
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
  }, [tool, options.context, options.onSuccess, options.onError]);

  const render = useCallback((input?: TInput) => {
    if (!data) return null;
    return tool.renderResult(data, input);
  }, [tool, data]);

  return {
    execute,
    render,
    data,
    loading,
    error,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    }
  };
}

export function useTools(tools: Tool[], options: UseToolOptions = {}) {
  const [toolStates, setToolStates] = useState(() => 
    tools.map(() => ({ data: null, loading: false, error: null }))
  );

  const execute = useCallback(async (toolIndex: number, input: any) => {
    setToolStates(prev => {
      const next = [...prev];
      next[toolIndex] = { ...next[toolIndex], loading: true, error: null };
      return next;
    });

    try {
      const result = await tools[toolIndex].run(input, options.context);
      setToolStates(prev => {
        const next = [...prev];
        next[toolIndex] = { data: result, loading: false, error: null };
        return next;
      });
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setToolStates(prev => {
        const next = [...prev];
        next[toolIndex] = { ...next[toolIndex], loading: false, error };
        return next;
      });
      options.onError?.(error);
      throw error;
    }
  }, [tools, options]);

  return {
    tools: toolStates,
    execute,
    executeAll: async (inputs: any[]) => {
      return await Promise.all(
        tools.map((_, i) => execute(i, inputs[i]))
      );
    },
    loading: toolStates.some(s => s.loading),
    errors: toolStates.map(s => s.error).filter(Boolean) as Error[],
    data: toolStates.map(s => s.data),
  };
}

export function useToolContext(initial?: Partial<ToolContext>): ToolContext {
  const cacheRef = useRef(new Map<string, any>());
  
  return {
    cache: cacheRef.current,
    fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
    ...initial,
  };
}

export function ToolRenderer<TInput = any, TOutput = any>({ 
  tool, 
  input,
  context,
  fallback,
  errorFallback,
  loadingFallback 
}: {
  tool: Tool<TInput, TOutput>;
  input?: TInput;
  context?: ToolContext;
  fallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
  loadingFallback?: React.ReactNode;
}) {
  const { execute, render, loading, error, data } = useTool(tool, { context });
  
  useEffect(() => {
    if (input !== undefined) {
      execute(input);
    }
  }, [input, execute]);

  if (loading) return <>{loadingFallback || <div>Loading...</div>}</>;
  if (error) return <>{errorFallback?.(error) || <div>Error: {error.message}</div>}</>;
  if (!data) return <>{fallback || null}</>;
  
  return <>{render(input)}</>;
}