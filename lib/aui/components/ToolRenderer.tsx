'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AUITool, AUIContext } from '../index';

interface ToolRendererProps<TInput = any, TOutput = any> {
  tool: AUITool<TInput, TOutput>;
  input?: TInput;
  context?: AUIContext;
  onResult?: (result: TOutput) => void;
  onError?: (error: Error) => void;
  autoExecute?: boolean;
}

export function ToolRenderer<TInput = any, TOutput = any>({
  tool,
  input,
  context,
  onResult,
  onError,
  autoExecute = true
}: ToolRendererProps<TInput, TOutput>) {
  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (autoExecute && input !== undefined) {
      executeTool();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, autoExecute]);

  const executeTool = useCallback(async () => {
    if (input === undefined) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await tool.run(input, context);
      setData(result);
      onResult?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [input, context, tool, onResult, onError]);

  const renderer = tool.renderer;
  if (!renderer) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-gray-600">No renderer defined for tool: {tool.name}</p>
        {data && (
          <pre className="mt-2 p-2 bg-gray-50 rounded text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  // Only pass data if it's not null to avoid SSR issues
  return renderer({ data: data as TOutput, input, loading, error: error || undefined });
}

// Hook for using tools in React components
export function useAUITool<TInput = any, TOutput = any>(
  tool: AUITool<TInput, TOutput>,
  context?: AUIContext
) {
  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (input: TInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await tool.run(input, context);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return {
    execute,
    reset,
    data,
    loading,
    error,
    isIdle: !loading && !data && !error,
    isSuccess: !loading && !!data && !error,
    isError: !loading && !!error
  };
}