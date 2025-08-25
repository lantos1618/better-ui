'use client';

import React, { useState, useCallback, useRef } from 'react';
import { AUITool, AUIContext } from '@/lib/aui';

interface UseAUIOptions {
  context?: Partial<AUIContext>;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

export function useAUI(tool: AUITool | string, options?: UseAUIOptions) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (input: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      let result: any;
      
      if (typeof tool === 'string') {
        // Execute by name via API
        const response = await fetch('/api/aui/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tool, 
            input,
            context: options?.context 
          }),
          signal: abortControllerRef.current.signal
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Execution failed');
        }
        
        const res = await response.json();
        result = res.data;
      } else {
        // Direct tool execution
        const ctx = {
          cache: new Map(),
          fetch: window.fetch,
          ...options?.context
        } as AUIContext;
        
        result = await tool.run(input, ctx);
      }
      
      setData(result);
      options?.onSuccess?.(result);
      return result;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      
      setError(err);
      options?.onError?.(err);
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [tool, options]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    execute,
    cancel,
    reset,
    loading,
    data,
    error
  };
}

// Hook for batch execution
export function useAUIBatch(options?: UseAUIOptions) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<Error[]>([]);

  const executeBatch = useCallback(async (
    tools: Array<{ tool: string; input: any }>
  ) => {
    try {
      setLoading(true);
      setErrors([]);
      
      const response = await fetch('/api/aui/execute', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tools,
          context: options?.context 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Batch execution failed');
      }
      
      const res = await response.json();
      setResults(res.data);
      options?.onSuccess?.(res.data);
      return res.data;
    } catch (err: any) {
      setErrors([err]);
      options?.onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  return {
    executeBatch,
    loading,
    results,
    errors
  };
}

// Hook for streaming responses
export function useAUIStream(tool: AUITool | string, options?: UseAUIOptions) {
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeStream = useCallback(async (input: any) => {
    try {
      setLoading(true);
      setError(null);
      setStream('');
      
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/aui/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: typeof tool === 'string' ? tool : tool.name,
          input,
          context: { ...options?.context, stream: true }
        }),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Stream failed');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        setStream(prev => prev + chunk);
      }
      
      options?.onSuccess?.(stream);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      
      setError(err);
      options?.onError?.(err);
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [tool, options, stream]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    executeStream,
    cancel,
    loading,
    stream,
    error
  };
}