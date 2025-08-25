'use client';

import { useState, useCallback, useRef } from 'react';
import aui, { AUITool, AUIContext } from '../index';

export interface UseAUIToolsOptions {
  cache?: boolean;
  optimistic?: boolean;
  retry?: number;
  onSuccess?: (result: any, tool: string) => void;
  onError?: (error: Error, tool: string) => void;
}

export function useAUITools(options: UseAUIToolsOptions = {}) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});
  const [data, setData] = useState<Record<string, any>>({});
  const cache = useRef(new Map<string, any>());

  const execute = useCallback(async <TInput = any, TOutput = any>(
    toolName: string,
    input: TInput
  ): Promise<TOutput | null> => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    setErrors(prev => ({ ...prev, [toolName]: null }));

    try {
      // Check cache if enabled
      if (options.cache) {
        const cacheKey = `${toolName}:${JSON.stringify(input)}`;
        if (cache.current.has(cacheKey)) {
          const cached = cache.current.get(cacheKey);
          setData(prev => ({ ...prev, [toolName]: cached }));
          setLoading(prev => ({ ...prev, [toolName]: false }));
          return cached;
        }
      }

      // Create context
      const ctx: AUIContext = {
        cache: cache.current,
        fetch: globalThis.fetch,
        isServer: false,
      };

      // Get tool
      const tool = aui.get(toolName);
      let result: TOutput;

      if (tool) {
        // Execute locally if tool exists
        result = await tool.run(input, ctx);
      } else {
        // Execute via API
        const response = await fetch(`/api/tools/${toolName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          throw new Error(`Failed to execute tool: ${response.statusText}`);
        }

        const data = await response.json();
        result = data.data;
      }

      // Cache result if enabled
      if (options.cache) {
        const cacheKey = `${toolName}:${JSON.stringify(input)}`;
        cache.current.set(cacheKey, result);
      }

      setData(prev => ({ ...prev, [toolName]: result }));
      options.onSuccess?.(result, toolName);
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setErrors(prev => ({ ...prev, [toolName]: err }));
      options.onError?.(err, toolName);
      
      // Retry logic
      if (options.retry && options.retry > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return execute(toolName, input);
      }
      
      return null;
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  }, [options]);

  const executeBatch = useCallback(async (
    executions: Array<{ tool: string; input: any }>
  ) => {
    setLoading(prev => {
      const newLoading = { ...prev };
      executions.forEach(exec => {
        newLoading[exec.tool] = true;
      });
      return newLoading;
    });

    try {
      const response = await fetch('/api/aui/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executions }),
      });

      if (!response.ok) {
        throw new Error('Batch execution failed');
      }

      const { results } = await response.json();
      
      results.forEach((result: any) => {
        if (result.success) {
          setData(prev => ({ ...prev, [result.tool]: result.data }));
          setErrors(prev => ({ ...prev, [result.tool]: null }));
          options.onSuccess?.(result.data, result.tool);
        } else {
          const error = new Error(result.error);
          setErrors(prev => ({ ...prev, [result.tool]: error }));
          options.onError?.(error, result.tool);
        }
      });

      return results;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Batch execution failed');
      executions.forEach(exec => {
        setErrors(prev => ({ ...prev, [exec.tool]: err }));
      });
      throw err;
    } finally {
      setLoading(prev => {
        const newLoading = { ...prev };
        executions.forEach(exec => {
          newLoading[exec.tool] = false;
        });
        return newLoading;
      });
    }
  }, [options]);

  const reset = useCallback((toolName?: string) => {
    if (toolName) {
      setData(prev => ({ ...prev, [toolName]: undefined }));
      setErrors(prev => ({ ...prev, [toolName]: null }));
      setLoading(prev => ({ ...prev, [toolName]: false }));
    } else {
      setData({});
      setErrors({});
      setLoading({});
      cache.current.clear();
    }
  }, []);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return {
    execute,
    executeBatch,
    loading,
    errors,
    data,
    reset,
    clearCache,
    isLoading: (tool: string) => loading[tool] || false,
    getError: (tool: string) => errors[tool] || null,
    getData: (tool: string) => data[tool],
  };
}

export function useAUITool<TInput = any, TOutput = any>(
  toolOrName: string | AUITool<TInput, TOutput>,
  options?: UseAUIToolsOptions
) {
  const toolName = typeof toolOrName === 'string' ? toolOrName : toolOrName.name;
  const tools = useAUITools(options);

  return {
    execute: (input: TInput) => tools.execute<TInput, TOutput>(toolName, input),
    loading: tools.isLoading(toolName),
    error: tools.getError(toolName),
    data: tools.getData(toolName) as TOutput | undefined,
    reset: () => tools.reset(toolName),
  };
}