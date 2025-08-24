'use client';

import { useState, useCallback } from 'react';
import { Tool, AUIContext, aui } from './lantos-ultra';

export function createClientTool<TInput = any, TOutput = any>(
  name: string,
  handler: (input: TInput, ctx: AUIContext) => Promise<TOutput> | TOutput
): Tool<TInput, TOutput> {
  return aui.tool(name).clientExecute(({ input, ctx }) => handler(input, ctx));
}

export function useToolExecution<TInput = any, TOutput = any>(
  tool: Tool<TInput, TOutput>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TOutput | null>(null);

  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const ctx = aui.createContext();
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
  }, [tool]);

  const render = useCallback(() => {
    if (!data || !tool.renderer) return null;
    return tool.renderer({ data, loading, error });
  }, [tool, data, loading, error]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    execute,
    render,
    loading,
    error,
    data,
    reset
  };
}