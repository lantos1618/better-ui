import { tools } from '@/lib/tools';

/**
 * Direct tool execution endpoint
 * Allows client-side UI to call tools without going through the AI
 *
 * SECURITY:
 * - Only registered tools can be executed
 * - Server handlers run here, ensuring secrets stay server-side
 * - Input is validated by the tool's Zod schema
 *
 * PRODUCTION CONSIDERATIONS:
 * - Add rate limiting to prevent abuse (e.g., using upstash/ratelimit)
 * - Add authentication if tools should be user-specific
 * - Consider adding request logging for audit trails
 *
 * Example rate limiting with Upstash:
 * ```
 * import { Ratelimit } from '@upstash/ratelimit';
 * import { Redis } from '@upstash/redis';
 *
 * const ratelimit = new Ratelimit({
 *   redis: Redis.fromEnv(),
 *   limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
 * });
 *
 * // In POST handler:
 * const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
 * const { success } = await ratelimit.limit(ip);
 * if (!success) return Response.json({ error: 'Rate limited' }, { status: 429 });
 * ```
 */

const toolMap = tools;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tool: toolName, input } = body;

    if (!toolName) {
      return Response.json(
        { error: 'Missing tool name' },
        { status: 400 }
      );
    }

    if (input === undefined) {
      return Response.json(
        { error: 'Missing input' },
        { status: 400 }
      );
    }

    const tool = toolMap[toolName as keyof typeof toolMap];
    if (!tool) {
      // SECURITY: Don't reveal which tools exist in error messages
      return Response.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    // Execute the tool server-side with proper context
    // SECURITY: isServer=true ensures server handler runs, not client
    const result = await tool.run(input, {
      isServer: true,
      // Add request context for server handlers that need it
      headers: req.headers,
      // NOTE: Add authentication/session context here if needed:
      // user: await getUser(req),
      // session: await getSession(req),
    });

    return Response.json({ result });
  } catch (error) {
    // Log full error server-side for debugging
    console.error('Tool execution error:', error);

    // SECURITY: Don't leak internal error details to client
    // Zod validation errors are safe to expose
    const isValidationError = error instanceof Error &&
      error.name === 'ZodError';

    return Response.json(
      {
        error: isValidationError
          ? error.message
          : 'Tool execution failed'
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
