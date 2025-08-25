import { cookies, headers } from 'next/headers';
import aui, { AUITool, AUIContext, z } from './index';

export interface ServerToolOptions {
  requireAuth?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  middleware?: (ctx: AUIContext) => Promise<void> | void;
}

/**
 * Creates a server-side AUI context with Next.js integration
 */
export async function createServerContext(
  additions?: Partial<AUIContext>
): Promise<AUIContext> {
  try {
    const cookieStore = await cookies();
    const headersList = await headers();
    
    return {
      cache: new Map(),
      fetch: globalThis.fetch,
      isServer: true,
      headers: Object.fromEntries(headersList.entries()),
      cookies: Object.fromEntries(
        cookieStore.getAll().map(c => [c.name, c.value])
      ),
      ...additions,
    };
  } catch {
    // Fallback for non-Next.js environments
    return {
      cache: new Map(),
      fetch: globalThis.fetch,
      isServer: true,
      ...additions,
    };
  }
}

export function createServerTool<TInput = any, TOutput = any>(
  name: string,
  schema: z.ZodType<TInput>,
  handler: (params: { input: TInput; ctx?: AUIContext }) => Promise<TOutput> | TOutput,
  options?: ServerToolOptions
): AUITool<TInput, TOutput> {
  const tool = aui
    .tool(name)
    .input(schema)
    .execute(async ({ input, ctx }) => {
      // Apply middleware
      if (options?.middleware) {
        await options.middleware(ctx!);
      }

      // Check auth if required
      if (options?.requireAuth && !ctx?.user) {
        throw new Error('Authentication required');
      }

      // Execute handler
      return await handler({ input, ctx });
    });

  return tool;
}

export async function executeServerTool<TInput = any, TOutput = any>(
  toolName: string,
  input: TInput,
  contextAdditions?: Partial<AUIContext>
): Promise<TOutput> {
  const ctx = await createServerContext(contextAdditions);
  return await aui.execute(toolName, input, ctx);
}

/**
 * Server action wrapper for tools
 */
export function createServerAction<TInput, TOutput>(
  tool: AUITool<TInput, TOutput>
) {
  return async (input: TInput): Promise<TOutput> => {
    'use server';
    const ctx = await createServerContext();
    return tool.run(input, ctx);
  };
}

/**
 * Batch execute multiple tools on the server
 */
export async function batchExecute(
  executions: Array<{ tool: string; input: any }>,
  contextAdditions?: Partial<AUIContext>
): Promise<Array<{ tool: string; result?: any; error?: string }>> {
  const ctx = await createServerContext(contextAdditions);
  
  const results = await Promise.allSettled(
    executions.map(exec => aui.execute(exec.tool, exec.input, ctx))
  );
  
  return results.map((result, index) => ({
    tool: executions[index].tool,
    ...(result.status === 'fulfilled'
      ? { result: result.value }
      : { error: result.reason?.message || 'Unknown error' }),
  }));
}

export function registerServerTools(tools: AUITool[]) {
  tools.forEach(tool => {
    if (!aui.has(tool.name)) {
      aui.get(tool.name); // This will register the tool
    }
  });
}

export async function handleToolRequest(
  request: Request
): Promise<Response> {
  try {
    const { tool: toolName, input, context } = await request.json();
    
    const tool = aui.get(toolName);
    if (!tool) {
      return new Response(
        JSON.stringify({ error: `Tool "${toolName}" not found` }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const ctx = await createServerContext(context);
    const result = await tool.run(input, ctx);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}