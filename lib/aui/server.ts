import { Tool, aui, AUIContext } from './lantos-ultra';
import { z } from 'zod';

export interface ServerToolOptions {
  requireAuth?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  middleware?: (ctx: AUIContext) => Promise<void> | void;
}

export function createServerTool<TInput = any, TOutput = any>(
  name: string,
  schema: z.ZodType<TInput>,
  handler: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput,
  options?: ServerToolOptions
): Tool<TInput, TOutput> {
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
      return await handler({ input, ctx: ctx! });
    });

  return tool;
}

export async function executeServerTool<TInput = any, TOutput = any>(
  toolName: string,
  input: TInput,
  ctx?: Partial<AUIContext>
): Promise<TOutput> {
  const context = aui.createContext(ctx);
  return await aui.execute(toolName, input, context);
}

export function registerServerTools(tools: Tool[]) {
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

    const ctx = aui.createContext(context);
    const result = await tool.run(input, ctx);

    return new Response(
      JSON.stringify({ success: true, result }),
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