import { useState, useCallback, useRef, useEffect } from 'react';
import { AUITool, AUIContext } from '../index';

export interface UseAUIToolOptions<TInput, TOutput> {
  // Caching
  cacheKey?: string | ((input: TInput) => string);
  cacheDuration?: number; // milliseconds
  
  // Retry
  retryCount?: number;
  retryDelay?: number | ((attempt: number) => number);
  
  // Callbacks
  onSuccess?: (data: TOutput, input: TInput) => void;
  onError?: (error: Error, input: TInput) => void;
  onLoadingChange?: (loading: boolean) => void;
  
  // Debounce/Throttle
  debounceMs?: number;
  throttleMs?: number;
  
  // Auto-execute
  autoExecute?: boolean;
  autoExecuteInput?: TInput;
  
  // Polling
  pollingInterval?: number;
  pollingCondition?: (data: TOutput | null) => boolean;
  
  // Context
  context?: Partial<AUIContext>;
}

export interface UseAUIToolResult<TInput, TOutput> {
  execute: (input: TInput) => Promise<TOutput>;
  cancel: () => void;
  reset: () => void;
  data: TOutput | null;
  error: Error | null;
  loading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  executionCount: number;
  lastExecutedAt: Date | null;
}

export function useAUIToolEnhanced<TInput = any, TOutput = any>(
  tool: AUITool<TInput, TOutput>,
  options: UseAUIToolOptions<TInput, TOutput> = {}
): UseAUIToolResult<TInput, TOutput> {
  const [data, setData] = useState<TOutput | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [executionCount, setExecutionCount] = useState(0);
  const [lastExecutedAt, setLastExecutedAt] = useState<Date | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, { data: TOutput; expires: number }>>(new Map());
  
  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);
  
  // Handle loading state changes
  useEffect(() => {
    options.onLoadingChange?.(loading);
  }, [loading, options.onLoadingChange]);
  
  // Get cache key for input
  const getCacheKey = useCallback((input: TInput): string => {
    if (!options.cacheKey) return '';
    if (typeof options.cacheKey === 'function') {
      return options.cacheKey(input);
    }
    return options.cacheKey;
  }, [options.cacheKey]);
  
  // Check cache
  const checkCache = useCallback((input: TInput): TOutput | null => {
    if (!options.cacheKey) return null;
    
    const key = getCacheKey(input);
    const cached = cacheRef.current.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    return null;
  }, [getCacheKey, options.cacheKey]);
  
  // Set cache
  const setCache = useCallback((input: TInput, data: TOutput) => {
    if (!options.cacheKey) return;
    
    const key = getCacheKey(input);
    const expires = Date.now() + (options.cacheDuration || 5 * 60 * 1000);
    cacheRef.current.set(key, { data, expires });
  }, [getCacheKey, options.cacheKey, options.cacheDuration]);
  
  // Execute with retry
  const executeWithRetry = useCallback(async (
    input: TInput,
    attempt: number = 0
  ): Promise<TOutput> => {
    try {
      const context: AUIContext = {
        cache: new Map(),
        fetch: globalThis.fetch,
        isServer: typeof window === 'undefined',
        ...options.context
      };
      
      const result = await tool.run(input, context);
      return result;
    } catch (error) {
      const maxRetries = options.retryCount || 0;
      
      if (attempt < maxRetries) {
        const delay = typeof options.retryDelay === 'function'
          ? options.retryDelay(attempt)
          : options.retryDelay || Math.pow(2, attempt) * 1000;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeWithRetry(input, attempt + 1);
      }
      
      throw error;
    }
  }, [tool, options.context, options.retryCount, options.retryDelay]);
  
  // Main execute function
  const execute = useCallback(async (input: TInput): Promise<TOutput> => {
    // Check cache first
    const cached = checkCache(input);
    if (cached) {
      setData(cached);
      setError(null);
      options.onSuccess?.(cached, input);
      return cached;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    setExecutionCount(prev => prev + 1);
    setLastExecutedAt(new Date());
    
    try {
      const result = await executeWithRetry(input);
      
      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Request cancelled');
      }
      
      setData(result);
      setCache(input, result);
      options.onSuccess?.(result, input);
      
      // Start polling if configured
      if (options.pollingInterval && options.pollingCondition?.(result)) {
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        
        pollingTimerRef.current = setInterval(() => {
          execute(input);
        }, options.pollingInterval);
      }
      
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error, input);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    checkCache,
    executeWithRetry,
    setCache,
    options.onSuccess,
    options.onError,
    options.pollingInterval,
    options.pollingCondition
  ]);
  
  // Debounced execute
  const debouncedExecute = useCallback((input: TInput): Promise<TOutput> => {
    return new Promise((resolve, reject) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        execute(input).then(resolve).catch(reject);
      }, options.debounceMs);
    });
  }, [execute, options.debounceMs]);
  
  // Throttled execute
  const throttledExecute = useCallback((input: TInput): Promise<TOutput> => {
    return new Promise((resolve, reject) => {
      if (throttleTimerRef.current) {
        reject(new Error('Request throttled'));
        return;
      }
      
      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
      }, options.throttleMs);
      
      execute(input).then(resolve).catch(reject);
    });
  }, [execute, options.throttleMs]);
  
  // Choose appropriate execute function
  const finalExecute = options.debounceMs
    ? debouncedExecute
    : options.throttleMs
    ? throttledExecute
    : execute;
  
  // Cancel execution
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setLoading(false);
  }, []);
  
  // Reset state
  const reset = useCallback(() => {
    cancel();
    setData(null);
    setError(null);
    setLoading(false);
    setExecutionCount(0);
    setLastExecutedAt(null);
    cacheRef.current.clear();
  }, [cancel]);
  
  // Auto-execute on mount
  useEffect(() => {
    if (options.autoExecute && options.autoExecuteInput) {
      finalExecute(options.autoExecuteInput);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    execute: finalExecute,
    cancel,
    reset,
    data,
    error,
    loading,
    isSuccess: !loading && !error && data !== null,
    isError: !loading && error !== null,
    isIdle: !loading && !error && data === null,
    executionCount,
    lastExecutedAt
  };
}

// Batch execution hook
export function useAUIToolBatch<TInput = any, TOutput = any>(
  tool: AUITool<TInput, TOutput>,
  options: UseAUIToolOptions<TInput, TOutput> = {}
) {
  const [results, setResults] = useState<Map<string, TOutput>>(new Map());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  const [loading, setLoading] = useState(false);
  
  const executeBatch = useCallback(async (inputs: TInput[]): Promise<Map<string, TOutput>> => {
    setLoading(true);
    const newResults = new Map<string, TOutput>();
    const newErrors = new Map<string, Error>();
    
    try {
      const promises = inputs.map(async (input, index) => {
        const key = JSON.stringify(input);
        try {
          const context: AUIContext = {
            cache: new Map(),
            fetch: globalThis.fetch,
            isServer: typeof window === 'undefined',
            ...options.context
          };
          
          const result = await tool.run(input, context);
          newResults.set(key, result);
          return result;
        } catch (error) {
          newErrors.set(key, error as Error);
          throw error;
        }
      });
      
      await Promise.allSettled(promises);
      
      setResults(newResults);
      setErrors(newErrors);
      
      return newResults;
    } finally {
      setLoading(false);
    }
  }, [tool, options.context]);
  
  return {
    executeBatch,
    results,
    errors,
    loading
  };
}

// Export all hooks
export { useAUIToolEnhanced as default };