'use client';

import { useState, useCallback, useMemo } from 'react';
import { Tool, ToolContext } from './lantos-aui';

// Global client context
const globalContext: ToolContext = {
  cache: new Map(),
  fetch: async (url: string, options?: any) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return res.json();
  },
};

// Hook to use a tool
export function useAUITool<TInput, TOutput>(tool: Tool<TInput, TOutput>) {
  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await tool.run(input, globalContext);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [tool]);

  const render = useCallback(() => {
    if (!data) return null;
    return tool.renderResult(data);
  }, [tool, data]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    render,
    reset,
  };
}

// Hook to use multiple tools
export function useAUI() {
  const [executing, setExecuting] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, any>>(new Map());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const execute = useCallback(async <TInput, TOutput>(
    tool: Tool<TInput, TOutput>,
    input: TInput
  ): Promise<TOutput> => {
    const toolName = tool.name;
    
    setExecuting(prev => new Set(prev).add(toolName));
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(toolName);
      return next;
    });

    try {
      const result = await tool.run(input, globalContext);
      setResults(prev => new Map(prev).set(toolName, result));
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setErrors(prev => new Map(prev).set(toolName, error));
      throw error;
    } finally {
      setExecuting(prev => {
        const next = new Set(prev);
        next.delete(toolName);
        return next;
      });
    }
  }, []);

  const isExecuting = useCallback((toolName: string) => {
    return executing.has(toolName);
  }, [executing]);

  const getResult = useCallback((toolName: string) => {
    return results.get(toolName);
  }, [results]);

  const getError = useCallback((toolName: string) => {
    return errors.get(toolName);
  }, [errors]);

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

  return {
    execute,
    isExecuting,
    getResult,
    getError,
    clearResult,
    executing: Array.from(executing),
  };
}

// Component to render a tool's output
export function AUIToolRenderer<TInput, TOutput>({ 
  tool, 
  data,
  input 
}: { 
  tool: Tool<TInput, TOutput>;
  data: TOutput;
  input?: TInput;
}) {
  return tool.renderResult(data, input);
}

// Provider component for custom context
export function AUIProvider({ 
  children,
  context
}: { 
  children: React.ReactNode;
  context?: Partial<ToolContext>;
}) {
  // Merge custom context with global
  if (context) {
    Object.assign(globalContext, context);
  }
  
  return <>{children}</>;
}