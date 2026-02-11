'use client';

import { useState, useCallback, useRef } from 'react';
import { Tool, ToolContext } from '../tool';

export interface UseToolStreamResult<TInput, TOutput> {
  /** Progressive partial data (shallow-merged from stream callbacks) */
  data: Partial<TOutput> | null;
  /** Complete validated data when streaming finishes */
  finalData: TOutput | null;
  /** True while receiving partial streaming updates */
  streaming: boolean;
  /** True before first stream chunk arrives */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** Execute the tool with streaming */
  execute: (input: TInput) => Promise<TOutput | null>;
  /** Reset all state */
  reset: () => void;
}

export function useToolStream<TInput, TOutput>(
  tool: Tool<TInput, TOutput>,
  options: {
    context?: Partial<ToolContext>;
    onSuccess?: (data: TOutput) => void;
    onError?: (error: Error) => void;
  } = {}
): UseToolStreamResult<TInput, TOutput> {
  const [data, setData] = useState<Partial<TOutput> | null>(null);
  const [finalData, setFinalData] = useState<TOutput | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const executionIdRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      const currentId = ++executionIdRef.current;
      setLoading(true);
      setStreaming(false);
      setError(null);
      setData(null);
      setFinalData(null);

      try {
        let accumulated: Partial<TOutput> = {};
        let result: TOutput | null = null;
        let firstChunkReceived = false;

        for await (const chunk of tool.runStream(input, {
          isServer: false,
          ...optionsRef.current.context,
        })) {
          if (currentId !== executionIdRef.current) return null;

          if (chunk.done) {
            result = chunk.partial as TOutput;
            setFinalData(result);
            setData(result as Partial<TOutput>);
            setStreaming(false);
            setLoading(false);
            optionsRef.current.onSuccess?.(result);
          } else {
            if (!firstChunkReceived) {
              firstChunkReceived = true;
              setStreaming(true);
              setLoading(false);
            }
            accumulated = { ...accumulated, ...chunk.partial };
            setData({ ...accumulated });
          }
        }

        setLoading(false);
        setStreaming(false);
        return result;
      } catch (err) {
        if (currentId !== executionIdRef.current) return null;
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setLoading(false);
        setStreaming(false);
        optionsRef.current.onError?.(e);
        return null;
      }
    },
    [tool]
  );

  const reset = useCallback(() => {
    setData(null);
    setFinalData(null);
    setStreaming(false);
    setLoading(false);
    setError(null);
  }, []);

  return { data, finalData, streaming, loading, error, execute, reset };
}
