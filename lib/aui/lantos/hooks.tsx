import { useState, useCallback, useMemo } from 'react';
import type { Tool, ToolContext } from './index';

// Hook for executing tools from React components
export function useAUITool<TInput, TOutput>(tool: Tool<TInput, TOutput>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TOutput | null>(null);
  
  // Create a context with client-side utilities
  const context = useMemo<ToolContext>(() => ({
    cache: new Map(),
    fetch: async (url: string, options?: RequestInit) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });
      return response.json();
    },
    user: null, // Could be populated from auth context
    session: null
  }), []);
  
  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate input
      const validatedInput = tool.inputSchema.parse(input);
      
      // Use client execution if available, otherwise fall back to server
      let result: TOutput;
      if (tool.clientExecute) {
        result = await tool.clientExecute({ 
          input: validatedInput, 
          ctx: context 
        });
      } else {
        // Call server endpoint
        const response = await fetch('/api/aui/lantos/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: tool.name,
            input: validatedInput
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }
        
        const data = await response.json();
        result = data.result;
      }
      
      setData(result);
      return result;
      
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [tool, context]);
  
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);
  
  return {
    execute,
    loading,
    error,
    data,
    reset,
    render: data ? () => tool.render({ data }) : null
  };
}

// Hook for managing multiple tools
export function useAUI() {
  const [results, setResults] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  
  const executeTool = useCallback(async (toolName: string, input: any) => {
    setLoading(prev => new Set(prev).add(toolName));
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(toolName);
      return next;
    });
    
    try {
      const response = await fetch('/api/aui/lantos/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, input })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to execute tool: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResults(prev => new Map(prev).set(toolName, data.result));
      return data.result;
      
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
  }, []);
  
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
  
  return {
    executeTool,
    getResult,
    getError,
    isLoading,
    clearResult,
    results: Object.fromEntries(results),
    errors: Object.fromEntries(errors),
    loading: Array.from(loading)
  };
}