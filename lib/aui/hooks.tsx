'use client';

import { useState, useCallback, useMemo, ReactElement } from 'react';
import type { AUITool, ToolContext } from './index';

// Hook for using a single AUI tool
export function useAUITool<TInput = any, TOutput = any>(tool: AUITool<TInput, TOutput>) {
  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create context with cache
  const ctx = useMemo<ToolContext>(() => ({
    cache: new Map(),
    fetch: async (url: string, options?: RequestInit) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      return response.json();
    },
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }), []);

  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);

    try {
      let result: TOutput;

      // Use client execution if available
      if (tool.clientExecute) {
        result = await tool.clientExecute({ input, ctx });
      } 
      // Fall back to server execution
      else if (tool.execute) {
        // If we're on the client and there's a server execute, call the API
        if (typeof window !== 'undefined') {
          const response = await fetch('/api/aui/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: tool.name, input }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Tool execution failed');
          }
          
          result = data.result;
        } else {
          // Server-side execution
          result = await tool.execute({ input, ctx });
        }
      } else {
        throw new Error(`Tool "${tool.name}" has no execution handler`);
      }

      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [tool, ctx]);

  const render = useCallback((): ReactElement | null => {
    if (!data || !tool.render) return null;
    return tool.render({ data, input: undefined });
  }, [data, tool]);

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

// Hook for managing multiple AUI tools
export function useAUI() {
  const [results, setResults] = useState<Map<string, any>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  // Shared context for all tools
  const ctx = useMemo<ToolContext>(() => ({
    cache: new Map(),
    fetch: async (url: string, options?: RequestInit) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      return response.json();
    },
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }), []);

  const executeTool = useCallback(async <TInput, TOutput>(
    tool: AUITool<TInput, TOutput> | string,
    input: TInput
  ): Promise<TOutput> => {
    const actualTool = typeof tool === 'string' 
      ? (await import('./index')).default.get(tool) as AUITool<TInput, TOutput>
      : tool;
    
    if (!actualTool) {
      throw new Error(`Tool "${tool}" not found`);
    }

    const toolName = actualTool.name;
    
    setLoadingStates(prev => new Map(prev).set(toolName, true));
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(toolName);
      return next;
    });

    try {
      let result: TOutput;

      if (actualTool.clientExecute) {
        result = await actualTool.clientExecute({ input, ctx });
      } else if (actualTool.execute) {
        if (typeof window !== 'undefined') {
          const response = await fetch('/api/aui/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: toolName, input }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Tool execution failed');
          }
          
          result = data.result;
        } else {
          result = await actualTool.execute({ input, ctx });
        }
      } else {
        throw new Error(`Tool "${toolName}" has no execution handler`);
      }

      setResults(prev => new Map(prev).set(toolName, result));
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setErrors(prev => new Map(prev).set(toolName, error));
      throw error;
    } finally {
      setLoadingStates(prev => new Map(prev).set(toolName, false));
    }
  }, [ctx]);

  const getResult = useCallback((toolName: string) => {
    return results.get(toolName);
  }, [results]);

  const isLoading = useCallback((toolName: string) => {
    return loadingStates.get(toolName) || false;
  }, [loadingStates]);

  const getError = useCallback((toolName: string) => {
    return errors.get(toolName);
  }, [errors]);

  const reset = useCallback((toolName?: string) => {
    if (toolName) {
      setResults(prev => {
        const next = new Map(prev);
        next.delete(toolName);
        return next;
      });
      setLoadingStates(prev => {
        const next = new Map(prev);
        next.delete(toolName);
        return next;
      });
      setErrors(prev => {
        const next = new Map(prev);
        next.delete(toolName);
        return next;
      });
    } else {
      setResults(new Map());
      setLoadingStates(new Map());
      setErrors(new Map());
    }
  }, []);

  return {
    executeTool,
    getResult,
    isLoading,
    getError,
    reset,
    results: Array.from(results.entries()),
    ctx,
  };
}