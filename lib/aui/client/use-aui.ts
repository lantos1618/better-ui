'use client';

import { useState, useCallback } from 'react';
import { AUITool, AUIContext } from '../index';

interface UseAUIOptions {
  cache?: boolean;
  context?: Partial<AUIContext>;
}

interface UseAUIResult<TInput, TOutput> {
  execute: (input: TInput) => Promise<void>;
  data: TOutput | null;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useAUI<TInput = any, TOutput = any>(
  tool: AUITool<TInput, TOutput>,
  options: UseAUIOptions = {}
): UseAUIResult<TInput, TOutput> {
  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const context: AUIContext = {
        cache: options.cache ? new Map() : new Map(),
        fetch: globalThis.fetch,
        isServer: false,
        ...options.context
      };
      
      const result = await tool.run(input, context);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [tool, options.cache, options.context]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { execute, data, loading, error, reset };
}