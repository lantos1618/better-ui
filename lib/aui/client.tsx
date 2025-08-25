'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AUIContext, AUITool } from './index';

interface AUIProviderProps {
  children: ReactNode;
  context?: Partial<AUIContext>;
}

const AUIReactContext = createContext<{
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
}>({
  cache: new Map(),
  fetch: globalThis.fetch
});

export function AUIProvider({ children, context }: AUIProviderProps) {
  const [cache] = useState(() => new Map());
  
  const value = {
    cache,
    fetch: context?.fetch || globalThis.fetch,
    user: context?.user,
    session: context?.session
  };

  return (
    <AUIReactContext.Provider value={value}>
      {children}
    </AUIReactContext.Provider>
  );
}

export function useAUIContext(): AUIContext {
  const ctx = useContext(AUIReactContext);
  return {
    ...ctx,
    env: typeof window !== 'undefined' ? {} : process.env as Record<string, string>
  };
}

interface UseToolResult<TInput, TOutput> {
  execute: (input: TInput) => Promise<TOutput>;
  loading: boolean;
  data?: TOutput;
  error?: Error;
}

export function useTool<TInput = any, TOutput = any>(
  tool: AUITool<TInput, TOutput>
): UseToolResult<TInput, TOutput> {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TOutput>();
  const [error, setError] = useState<Error>();
  const ctx = useAUIContext();

  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(undefined);
    
    try {
      const result = await tool.run(input, ctx);
      setData(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [tool, ctx]);

  return { execute, loading, data, error };
}

interface ToolComponentProps<TInput, TOutput> {
  tool: AUITool<TInput, TOutput>;
  input?: TInput;
  onResult?: (data: TOutput) => void;
  onError?: (error: Error) => void;
}

export function ToolComponent<TInput = any, TOutput = any>({ 
  tool, 
  input,
  onResult,
  onError 
}: ToolComponentProps<TInput, TOutput>) {
  const { execute, loading, data, error } = useTool(tool);
  
  React.useEffect(() => {
    if (input) {
      execute(input).then(onResult).catch(onError);
    }
  }, [input]);

  if (!tool.renderer) {
    return null;
  }

  const Renderer = tool.renderer;
  return <Renderer data={data!} input={input} loading={loading} error={error} />;
}