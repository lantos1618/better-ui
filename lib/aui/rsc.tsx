import { Suspense } from 'react';
import { AUITool } from './index';
import { executeServerTool, createServerContext } from './server';

/**
 * Server Component wrapper for AUI tools
 * Enables direct tool execution in React Server Components
 */
export async function ServerTool<TInput, TOutput>({
  tool,
  input,
  fallback,
  errorFallback,
}: {
  tool: string | AUITool<TInput, TOutput>;
  input: TInput;
  fallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}) {
  try {
    const toolName = typeof tool === 'string' ? tool : tool.name;
    const data = await executeServerTool<TInput, TOutput>(toolName, input);
    
    // Get the tool instance for rendering
    const toolInstance = typeof tool === 'string' 
      ? (await import('./index')).default.get(toolName) as AUITool<TInput, TOutput>
      : tool;
    
    if (!toolInstance?.renderer) {
      return <pre>{JSON.stringify(data, null, 2)}</pre>;
    }
    
    return toolInstance.renderer({ data, input, loading: false });
  } catch (error) {
    if (errorFallback) {
      return errorFallback(error instanceof Error ? error : new Error(String(error)));
    }
    throw error;
  }
}

/**
 * Streaming Server Component wrapper with Suspense
 */
export function StreamingServerTool<TInput, TOutput>({
  tool,
  input,
  fallback = <div>Loading...</div>,
  errorFallback,
}: {
  tool: string | AUITool<TInput, TOutput>;
  input: TInput;
  fallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}) {
  return (
    <Suspense fallback={fallback}>
      {/* @ts-expect-error - Async Server Component */}
      <ServerTool
        tool={tool}
        input={input}
        errorFallback={errorFallback}
      />
    </Suspense>
  );
}

/**
 * Parallel tool execution for Server Components
 */
export async function ParallelTools({
  tools,
  fallback,
  errorFallback,
}: {
  tools: Array<{
    tool: string | AUITool<any, any>;
    input: any;
    key?: string;
  }>;
  fallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}) {
  const results = await Promise.allSettled(
    tools.map(async ({ tool, input }) => {
      const toolName = typeof tool === 'string' ? tool : tool.name;
      const data = await executeServerTool(toolName, input);
      const toolInstance = typeof tool === 'string' 
        ? (await import('./index')).default.get(toolName)
        : tool;
      return { tool: toolInstance, data, input };
    })
  );
  
  return (
    <>
      {results.map((result, index) => {
        const key = tools[index].key || index.toString();
        
        if (result.status === 'rejected') {
          if (errorFallback) {
            return <div key={key}>{errorFallback(result.reason)}</div>;
          }
          return <div key={key}>Error: {result.reason.message}</div>;
        }
        
        const { tool, data, input } = result.value;
        
        if (!tool?.renderer) {
          return <pre key={key}>{JSON.stringify(data, null, 2)}</pre>;
        }
        
        return <div key={key}>{tool.renderer({ data, input, loading: false })}</div>;
      })}
    </>
  );
}

/**
 * Tool execution with server-side data fetching
 */
export async function FetchAndRenderTool<TInput, TOutput>({
  tool,
  inputFetcher,
  fallback,
  errorFallback,
}: {
  tool: string | AUITool<TInput, TOutput>;
  inputFetcher: () => Promise<TInput> | TInput;
  fallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}) {
  try {
    const input = await inputFetcher();
    return (
      <>
        {/* @ts-expect-error - Async Server Component */}
        <ServerTool
          tool={tool}
          input={input}
          fallback={fallback}
          errorFallback={errorFallback}
        />
      </>
    );
  } catch (error) {
    if (errorFallback) {
      return errorFallback(error instanceof Error ? error : new Error(String(error)));
    }
    throw error;
  }
}

/**
 * Conditional tool rendering based on server-side logic
 */
export async function ConditionalTool<TInput, TOutput>({
  condition,
  tool,
  input,
  fallback,
  elseFallback,
  errorFallback,
}: {
  condition: () => Promise<boolean> | boolean;
  tool: string | AUITool<TInput, TOutput>;
  input: TInput;
  fallback?: React.ReactNode;
  elseFallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}) {
  try {
    const shouldRender = await condition();
    
    if (!shouldRender) {
      return <>{elseFallback}</>;
    }
    
    return (
      <>
        {/* @ts-expect-error - Async Server Component */}
        <ServerTool
          tool={tool}
          input={input}
          fallback={fallback}
          errorFallback={errorFallback}
        />
      </>
    );
  } catch (error) {
    if (errorFallback) {
      return errorFallback(error instanceof Error ? error : new Error(String(error)));
    }
    throw error;
  }
}