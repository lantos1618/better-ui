'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tool, ToolContext } from '../tool';

export interface UseToolOptions {
  /** Auto-execute on mount or when input changes */
  auto?: boolean;
  /** Custom context overrides */
  context?: Partial<ToolContext>;
  /** Callback on success */
  onSuccess?: (data: any) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseToolResult<TInput, TOutput> {
  /** The result data */
  data: TOutput | null;
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** Execute the tool manually */
  execute: (input?: TInput) => Promise<TOutput | null>;
  /** Reset state */
  reset: () => void;
  /** Whether the tool has been executed at least once */
  executed: boolean;
}

/**
 * React hook for executing tools
 *
 * @example
 * // Manual execution
 * const { data, loading, execute } = useTool(weather);
 * <button onClick={() => execute({ city: 'London' })}>Get Weather</button>
 *
 * @example
 * // Auto execution when input changes
 * const { data, loading } = useTool(weather, { city }, { auto: true });
 *
 * @example
 * // With callbacks
 * const { execute } = useTool(weather, undefined, {
 *   onSuccess: (data) => console.log('Got weather:', data),
 *   onError: (error) => console.error('Failed:', error),
 * });
 */
export function useTool<TInput, TOutput>(
  tool: Tool<TInput, TOutput>,
  initialInput?: TInput,
  options: UseToolOptions = {}
): UseToolResult<TInput, TOutput> {
  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [executed, setExecuted] = useState(false);

  const inputRef = useRef(initialInput);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(
    async (input?: TInput): Promise<TOutput | null> => {
      const finalInput = input ?? inputRef.current;

      if (finalInput === undefined) {
        const err = new Error('No input provided to tool');
        setError(err);
        optionsRef.current.onError?.(err);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const context: Partial<ToolContext> = {
          cache: new Map(),
          fetch: globalThis.fetch?.bind(globalThis),
          isServer: false,
          ...optionsRef.current.context,
        };

        const result = await tool.run(finalInput, context);
        setData(result);
        setExecuted(true);
        optionsRef.current.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        optionsRef.current.onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [tool]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setExecuted(false);
  }, []);

  // Auto-execute when input changes (if enabled)
  useEffect(() => {
    if (options.auto && initialInput !== undefined) {
      inputRef.current = initialInput;
      execute(initialInput);
    }
  }, [options.auto, initialInput, execute]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    executed,
  };
}

/**
 * React hook for executing multiple tools
 *
 * @example
 * const tools = useTools({ weather, search });
 *
 * await tools.weather.execute({ city: 'London' });
 * await tools.search.execute({ query: 'restaurants' });
 */
export function useTools<T extends Record<string, Tool>>(
  tools: T,
  options: UseToolOptions = {}
): {
  [K in keyof T]: UseToolResult<
    T[K] extends Tool<infer I, any> ? I : never,
    T[K] extends Tool<any, infer O> ? O : never
  >;
} {
  const results: any = {};

  for (const [name, tool] of Object.entries(tools)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[name] = useTool(tool, undefined, options);
  }

  return results;
}

export default useTool;
