'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AUIContext, AUITool } from '../lantos';

interface AUIClientContext extends AUIContext {
  executeRemote: (tool: string, input: any) => Promise<any>;
}

const ClientContext = createContext<AUIClientContext | null>(null);

export function AUIProvider({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => new Map<string, any>());

  const executeRemote = useCallback(async (tool: string, input: any) => {
    const response = await fetch('/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, input }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Tool execution failed');
    }

    const { data } = await response.json();
    return data;
  }, []);

  const context: AUIClientContext = {
    cache,
    fetch: fetch.bind(globalThis),
    executeRemote,
  };

  return (
    <ClientContext.Provider value={context}>
      {children}
    </ClientContext.Provider>
  );
}

export function useAUI() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useAUI must be used within AUIProvider');
  }
  return context;
}

export function useTool<TInput, TOutput>(
  tool: AUITool<TInput, TOutput> | string,
  options?: {
    cache?: boolean;
    retry?: number;
    debounce?: number;
  }
) {
  const ctx = useAUI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TOutput | null>(null);

  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);

    const toolName = typeof tool === 'string' ? tool : tool.name;
    const cacheKey = options?.cache ? `${toolName}:${JSON.stringify(input)}` : null;

    if (cacheKey && ctx.cache.has(cacheKey)) {
      setData(ctx.cache.get(cacheKey));
      setLoading(false);
      return ctx.cache.get(cacheKey);
    }

    let attempts = 0;
    const maxAttempts = options?.retry || 1;

    while (attempts < maxAttempts) {
      try {
        const result = typeof tool === 'string'
          ? await ctx.executeRemote(tool, input)
          : await tool.run(input, ctx);

        if (cacheKey) {
          ctx.cache.set(cacheKey, result);
        }

        setData(result);
        setLoading(false);
        return result;
      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          setError(error);
          setLoading(false);
          throw error;
        }
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts - 1)));
      }
    }
  }, [tool, ctx, options?.cache, options?.retry]);

  const debouncedExecute = options?.debounce
    ? useCallback(
        debounce(execute, options.debounce),
        [execute, options.debounce]
      )
    : execute;

  return {
    execute: debouncedExecute,
    loading,
    error,
    data,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    return new Promise((resolve) => {
      timeout = setTimeout(() => resolve(func(...args)), wait);
    });
  }) as T;
}

interface ToolRendererProps<TInput, TOutput> {
  tool: AUITool<TInput, TOutput>;
  input?: TInput;
  autoExecute?: boolean;
  onResult?: (data: TOutput) => void;
  onError?: (error: Error) => void;
}

export function ToolRenderer<TInput, TOutput>({
  tool,
  input,
  autoExecute = false,
  onResult,
  onError,
}: ToolRendererProps<TInput, TOutput>) {
  const { execute, loading, error, data } = useTool(tool);

  useEffect(() => {
    if (autoExecute && input) {
      execute(input)
        .then(result => onResult?.(result))
        .catch(err => onError?.(err));
    }
  }, [autoExecute, input, execute, onResult, onError]);

  if (!tool.renderer) {
    return null;
  }

  return tool.renderer({ data: data!, input, loading, error: error || undefined });
}

export function ToolExecutor() {
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [input, setInput] = useState<string>('{}');
  const [result, setResult] = useState<any>(null);
  const { executeRemote } = useAUI();

  const handleExecute = async () => {
    try {
      const parsedInput = JSON.parse(input);
      const data = await executeRemote(selectedTool, parsedInput);
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="tool-executor">
      <input
        type="text"
        placeholder="Tool name"
        value={selectedTool}
        onChange={(e) => setSelectedTool(e.target.value)}
      />
      <textarea
        placeholder="Input (JSON)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button onClick={handleExecute}>Execute</button>
      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}