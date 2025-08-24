'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ToolCall, ToolResult, ToolDefinition } from '../types';
import { ClientToolExecutor } from './executor';

export interface UseToolOptions {
  cache?: boolean;
  cacheTimeout?: number;
  onSuccess?: (result: ToolResult) => void;
  onError?: (error: string) => void;
}

export interface UseToolReturn<TInput, TOutput> {
  execute: (input: TInput) => Promise<TOutput>;
  loading: boolean;
  data: TOutput | null;
  error: string | null;
  reset: () => void;
}

export function useTool<TInput = any, TOutput = any>(
  toolNameOrDef: string | ToolDefinition<TInput, TOutput>,
  options: UseToolOptions = {}
): UseToolReturn<TInput, TOutput> {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const executorRef = useRef<ClientToolExecutor>();
  
  useEffect(() => {
    executorRef.current = new ClientToolExecutor({
      cacheTimeout: options.cacheTimeout,
    });
    
    if (typeof toolNameOrDef === 'object') {
      executorRef.current.registerTool(toolNameOrDef);
    }
    
    return () => {
      executorRef.current?.clearCache();
    };
  }, [toolNameOrDef, options.cacheTimeout]);
  
  const execute = useCallback(async (input: TInput): Promise<TOutput> => {
    if (!executorRef.current) {
      throw new Error('Executor not initialized');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const toolName = typeof toolNameOrDef === 'string' 
        ? toolNameOrDef 
        : toolNameOrDef.name;
      
      const toolCall: ToolCall = {
        id: Date.now().toString(),
        toolName,
        input,
      };
      
      const result = await executorRef.current.execute(toolCall);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setData(result.output);
      options.onSuccess?.(result);
      
      return result.output;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toolNameOrDef, options]);
  
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);
  
  return {
    execute,
    loading,
    data,
    error,
    reset,
  };
}

// Batch execution hook
export function useToolBatch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  
  const executorRef = useRef<ClientToolExecutor>();
  
  useEffect(() => {
    executorRef.current = new ClientToolExecutor();
    return () => {
      executorRef.current?.clearCache();
    };
  }, []);
  
  const executeBatch = useCallback(async (toolCalls: ToolCall[]): Promise<ToolResult[]> => {
    if (!executorRef.current) {
      throw new Error('Executor not initialized');
    }
    
    setLoading(true);
    setErrors([]);
    
    try {
      const results = await executorRef.current.executeBatch(toolCalls);
      
      const errors = results
        .filter(r => r.error)
        .map(r => r.error!);
      
      setResults(results);
      setErrors(errors);
      
      return results;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    executeBatch,
    loading,
    results,
    errors,
  };
}

// Tool renderer hook
export function useToolRenderer<TInput = any, TOutput = any>(
  tool: ToolDefinition<TInput, TOutput>
) {
  const { execute, loading, data, error } = useTool(tool);
  
  const render = useCallback((input: TInput) => {
    if (!tool.render) return null;
    if (!data) return null;
    
    return tool.render({ data, input });
  }, [tool, data]);
  
  return {
    execute,
    render,
    loading,
    data,
    error,
  };
}