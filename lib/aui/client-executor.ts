import { AUIContext } from './core';
import { AIControlledTool } from './ai-control';

export interface CacheStrategy {
  key: (toolName: string, input: any) => string;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of cached items
}

export interface ClientExecutorOptions {
  baseUrl?: string;
  cache?: {
    enabled: boolean;
    strategy?: CacheStrategy;
    storage?: 'memory' | 'localStorage' | 'sessionStorage';
  };
  retry?: {
    attempts?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
  };
  timeout?: number;
  headers?: HeadersInit;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl?: number;
}

export class ClientExecutor {
  private cache: Map<string, CacheEntry> = new Map();
  private options: Required<ClientExecutorOptions>;
  private localStorage?: Storage;
  private sessionStorage?: Storage;

  constructor(options: ClientExecutorOptions = {}) {
    this.options = {
      baseUrl: options.baseUrl || '/api/aui/execute',
      cache: {
        enabled: options.cache?.enabled ?? true,
        strategy: options.cache?.strategy || {
          key: (tool, input) => `${tool}:${JSON.stringify(input)}`,
          ttl: 5 * 60 * 1000, // 5 minutes default
          maxSize: 100,
        },
        storage: options.cache?.storage || 'memory',
      },
      retry: {
        attempts: options.retry?.attempts ?? 3,
        delay: options.retry?.delay ?? 1000,
        backoff: options.retry?.backoff || 'exponential',
      },
      timeout: options.timeout ?? 30000, // 30 seconds default
      headers: options.headers || {},
    };

    if (typeof window !== 'undefined') {
      this.localStorage = window.localStorage;
      this.sessionStorage = window.sessionStorage;
    }
  }

  async execute<TInput = any, TOutput = any>(
    toolName: string,
    input: TInput,
    context?: Partial<AUIContext>
  ): Promise<TOutput> {
    // Check cache first if enabled
    if (this.options.cache.enabled) {
      const cached = this.getFromCache(toolName, input);
      if (cached !== null) {
        return cached;
      }
    }

    // Execute with retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.options.retry.attempts!; attempt++) {
      try {
        const result = await this.executeOnce<TInput, TOutput>(
          toolName,
          input,
          context
        );

        // Store in cache if enabled
        if (this.options.cache.enabled) {
          this.storeInCache(toolName, input, result);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('Tool') && error.message.includes('not found')) {
            throw error; // Don't retry if tool doesn't exist
          }
          if (error.message.includes('Rate limit')) {
            throw error; // Don't retry on rate limit
          }
        }

        // Calculate delay for next attempt
        if (attempt < this.options.retry.attempts! - 1) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Execution failed after retries');
  }

  private async executeOnce<TInput = any, TOutput = any>(
    toolName: string,
    input: TInput,
    context?: Partial<AUIContext>
  ): Promise<TOutput> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.options.timeout
    );

    try {
      const response = await fetch(this.options.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: JSON.stringify({
          tool: toolName,
          input,
          context,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Execution timeout after ${this.options.timeout}ms`);
      }
      
      throw error;
    }
  }

  private getFromCache(toolName: string, input: any): any | null {
    const key = this.options.cache.strategy!.key(toolName, input);
    
    // Check appropriate storage
    let entry: CacheEntry | null = null;
    
    switch (this.options.cache.storage) {
      case 'localStorage':
        if (this.localStorage) {
          const stored = this.localStorage.getItem(key);
          if (stored) {
            try {
              entry = JSON.parse(stored);
            } catch {
              // Invalid cache entry
            }
          }
        }
        break;
        
      case 'sessionStorage':
        if (this.sessionStorage) {
          const stored = this.sessionStorage.getItem(key);
          if (stored) {
            try {
              entry = JSON.parse(stored);
            } catch {
              // Invalid cache entry
            }
          }
        }
        break;
        
      default: // memory
        entry = this.cache.get(key) || null;
    }
    
    if (!entry) return null;
    
    // Check if entry is still valid
    const now = Date.now();
    const ttl = entry.ttl || this.options.cache.strategy!.ttl;
    
    if (ttl && now - entry.timestamp > ttl) {
      // Entry expired
      this.removeFromCache(key);
      return null;
    }
    
    return entry.data;
  }

  private storeInCache(toolName: string, input: any, data: any): void {
    const key = this.options.cache.strategy!.key(toolName, input);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.options.cache.strategy!.ttl,
    };
    
    switch (this.options.cache.storage) {
      case 'localStorage':
        if (this.localStorage) {
          try {
            this.localStorage.setItem(key, JSON.stringify(entry));
            this.enforceMaxSize('localStorage');
          } catch {
            // Storage quota exceeded
          }
        }
        break;
        
      case 'sessionStorage':
        if (this.sessionStorage) {
          try {
            this.sessionStorage.setItem(key, JSON.stringify(entry));
            this.enforceMaxSize('sessionStorage');
          } catch {
            // Storage quota exceeded
          }
        }
        break;
        
      default: // memory
        this.cache.set(key, entry);
        this.enforceMaxSize('memory');
    }
  }

  private removeFromCache(key: string): void {
    switch (this.options.cache.storage) {
      case 'localStorage':
        if (this.localStorage) {
          this.localStorage.removeItem(key);
        }
        break;
        
      case 'sessionStorage':
        if (this.sessionStorage) {
          this.sessionStorage.removeItem(key);
        }
        break;
        
      default:
        this.cache.delete(key);
    }
  }

  private enforceMaxSize(storage: 'memory' | 'localStorage' | 'sessionStorage'): void {
    const maxSize = this.options.cache.strategy!.maxSize;
    if (!maxSize) return;
    
    if (storage === 'memory') {
      if (this.cache.size > maxSize) {
        // Remove oldest entries
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = entries.slice(0, entries.length - maxSize);
        toRemove.forEach(([key]) => this.cache.delete(key));
      }
    } else {
      const storageObj = storage === 'localStorage' ? this.localStorage : this.sessionStorage;
      if (!storageObj) return;
      
      // Get all cache keys
      const cacheKeys: Array<{ key: string; timestamp: number }> = [];
      for (let i = 0; i < storageObj.length; i++) {
        const key = storageObj.key(i);
        if (key) {
          try {
            const entry = JSON.parse(storageObj.getItem(key)!);
            if (entry && entry.timestamp) {
              cacheKeys.push({ key, timestamp: entry.timestamp });
            }
          } catch {
            // Skip invalid entries
          }
        }
      }
      
      if (cacheKeys.length > maxSize) {
        cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = cacheKeys.slice(0, cacheKeys.length - maxSize);
        toRemove.forEach(({ key }) => storageObj.removeItem(key));
      }
    }
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.options.retry.delay!;
    
    if (this.options.retry.backoff === 'exponential') {
      return baseDelay * Math.pow(2, attempt);
    }
    
    return baseDelay * (attempt + 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache(): void {
    switch (this.options.cache.storage) {
      case 'localStorage':
        if (this.localStorage) {
          this.localStorage.clear();
        }
        break;
        
      case 'sessionStorage':
        if (this.sessionStorage) {
          this.sessionStorage.clear();
        }
        break;
        
      default:
        this.cache.clear();
    }
  }

  getCacheStats(): {
    size: number;
    storage: string;
    enabled: boolean;
  } {
    let size = 0;
    
    switch (this.options.cache.storage) {
      case 'localStorage':
        size = this.localStorage?.length || 0;
        break;
        
      case 'sessionStorage':
        size = this.sessionStorage?.length || 0;
        break;
        
      default:
        size = this.cache.size;
    }
    
    return {
      size,
      storage: this.options.cache.storage!,
      enabled: this.options.cache.enabled,
    };
  }
}

// Default client executor instance
export const clientExecutor = new ClientExecutor();

// Enhanced client execution with optimistic updates
export async function executeClientTool<TInput = any, TOutput = any>(
  toolName: string,
  input: TInput,
  options?: {
    optimistic?: () => TOutput;
    onSuccess?: (result: TOutput) => void;
    onError?: (error: Error) => void;
    context?: Partial<AUIContext>;
  }
): Promise<TOutput> {
  // Return optimistic result immediately if provided
  if (options?.optimistic) {
    const optimisticResult = options.optimistic();
    
    // Execute in background
    clientExecutor.execute<TInput, TOutput>(toolName, input, options?.context)
      .then(result => {
        options?.onSuccess?.(result);
      })
      .catch(error => {
        options?.onError?.(error);
      });
    
    return optimisticResult;
  }
  
  // Normal execution
  try {
    const result = await clientExecutor.execute<TInput, TOutput>(
      toolName,
      input,
      options?.context
    );
    options?.onSuccess?.(result);
    return result;
  } catch (error) {
    options?.onError?.(error as Error);
    throw error;
  }
}