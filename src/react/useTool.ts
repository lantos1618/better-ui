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

/** Internal state for a single tool in useTools */
interface ToolState<TOutput = any> {
  data: TOutput | null;
  loading: boolean;
  error: Error | null;
  executed: boolean;
}

/** Combined state for all tools */
type ToolsState<T extends Record<string, Tool>> = {
  [K in keyof T]: ToolState<T[K] extends Tool<any, infer O> ? O : never>;
};

/**
 * React hook for executing multiple tools
 *
 * This hook properly manages state for multiple tools using a single useState,
 * avoiding the hooks-in-loop anti-pattern.
 *
 * @example
 * // Define tools outside component or memoize with useMemo
 * const myTools = { weather, search };
 *
 * function MyComponent() {
 *   const tools = useTools(myTools);
 *   await tools.weather.execute({ city: 'London' });
 *   await tools.search.execute({ query: 'restaurants' });
 * }
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
  // Store tools ref for stability check
  const toolsRef = useRef(tools);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Warn if tools object changes (keys must remain stable)
  if (process.env.NODE_ENV !== 'production') {
    const prevKeys = Object.keys(toolsRef.current);
    const currKeys = Object.keys(tools);
    if (
      prevKeys.length !== currKeys.length ||
      !currKeys.every((k) => prevKeys.includes(k))
    ) {
      console.warn(
        'useTools: The tools object keys changed between renders. ' +
          'This may cause unexpected behavior. ' +
          'Define tools outside the component or memoize with useMemo.'
      );
    }
    // Update ref for next comparison
    toolsRef.current = tools;
  }

  // Initialize state for all tools - single useState call
  const [state, setState] = useState<ToolsState<T>>(() => {
    const initial = {} as ToolsState<T>;
    for (const name of Object.keys(tools)) {
      initial[name as keyof T] = {
        data: null,
        loading: false,
        error: null,
        executed: false,
      } as ToolState;
    }
    return initial;
  });

  // Create execute function for a specific tool
  const createExecute = useCallback(
    <TInput, TOutput>(toolName: keyof T, tool: Tool<TInput, TOutput>) => {
      return async (input?: TInput): Promise<TOutput | null> => {
        if (input === undefined) {
          const err = new Error('No input provided to tool');
          setState((prev) => ({
            ...prev,
            [toolName]: { ...prev[toolName], error: err },
          }));
          optionsRef.current.onError?.(err);
          return null;
        }

        setState((prev) => ({
          ...prev,
          [toolName]: { ...prev[toolName], loading: true, error: null },
        }));

        try {
          const context: Partial<ToolContext> = {
            cache: new Map(),
            fetch: globalThis.fetch?.bind(globalThis),
            isServer: false,
            ...optionsRef.current.context,
          };

          const result = await tool.run(input, context);

          setState((prev) => ({
            ...prev,
            [toolName]: {
              data: result,
              loading: false,
              error: null,
              executed: true,
            },
          }));

          optionsRef.current.onSuccess?.(result);
          return result;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          setState((prev) => ({
            ...prev,
            [toolName]: { ...prev[toolName], loading: false, error },
          }));
          optionsRef.current.onError?.(error);
          return null;
        }
      };
    },
    []
  );

  // Create reset function for a specific tool
  const createReset = useCallback((toolName: keyof T) => {
    return () => {
      setState((prev) => ({
        ...prev,
        [toolName]: {
          data: null,
          loading: false,
          error: null,
          executed: false,
        },
      }));
    };
  }, []);

  // Build results object with execute/reset functions
  // This is computed on each render but functions are stable via useCallback
  const results = {} as {
    [K in keyof T]: UseToolResult<
      T[K] extends Tool<infer I, any> ? I : never,
      T[K] extends Tool<any, infer O> ? O : never
    >;
  };

  for (const [name, tool] of Object.entries(tools)) {
    const toolName = name as keyof T;
    const toolState = state[toolName];

    results[toolName] = {
      data: toolState?.data ?? null,
      loading: toolState?.loading ?? false,
      error: toolState?.error ?? null,
      executed: toolState?.executed ?? false,
      execute: createExecute(toolName, tool),
      reset: createReset(toolName),
    } as any;
  }

  return results;
}

export default useTool;
