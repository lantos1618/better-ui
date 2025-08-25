'use client';

import aui, { AUITool, AUIContext, z } from './index';

export interface ClientToolOptions {
  cacheKey?: (input: any) => string;
  cacheTTL?: number; // in milliseconds
  retries?: number;
  timeout?: number; // in milliseconds
}

export function createClientTool<TInput = any, TOutput = any>(
  name: string,
  schema: z.ZodType<TInput>,
  handler: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput,
  options?: ClientToolOptions
): AUITool<TInput, TOutput> {
  const tool = aui
    .tool(name)
    .input(schema)
    .execute(handler)
    .clientExecute(async ({ input, ctx }) => {
      // Check cache if caching is enabled
      if (options?.cacheKey) {
        const key = options.cacheKey(input);
        const cached = ctx.cache.get(key);
        
        if (cached && cached.timestamp) {
          const age = Date.now() - cached.timestamp;
          if (!options.cacheTTL || age < options.cacheTTL) {
            return cached.data;
          }
        }
      }

      // Execute with retries
      let lastError: Error | undefined;
      const maxRetries = options?.retries || 0;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await Promise.race([
            handler({ input, ctx }),
            ...(options?.timeout ? [
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), options.timeout)
              )
            ] : [])
          ]);

          // Cache result if caching is enabled
          if (options?.cacheKey) {
            const key = options.cacheKey(input);
            ctx.cache.set(key, { data: result, timestamp: Date.now() });
          }

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          }
        }
      }

      throw lastError || new Error('Failed after retries');
    });

  return tool;
}

export async function executeClientTool<TInput = any, TOutput = any>(
  toolName: string,
  input: TInput,
  serverUrl: string = '/api/aui/execute'
): Promise<TOutput> {
  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: toolName, input })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Tool execution failed');
  }

  const { result } = await response.json();
  return result;
}

export { useToolExecution } from './hooks';