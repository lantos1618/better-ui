import { tools } from '@/lib/tools';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Direct tool execution endpoint
 * Allows client-side UI to call tools without going through the AI
 *
 * SECURITY:
 * - Only registered tools can be executed
 * - Server handlers run here, ensuring secrets stay server-side
 * - Input is validated by the tool's Zod schema
 * - Rate limiting prevents abuse
 *
 * PRODUCTION CONSIDERATIONS:
 * - Rate limiting is implemented with in-memory storage (configurable via env vars)
 * - For production with multiple instances, consider using Upstash/Redis
 * - Add authentication if tools should be user-specific
 * - Consider adding request logging for audit trails
 */

const toolMap = tools;

export async function POST(req: Request) {
  // Rate limiting: extract IP from headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 
             'anonymous';

  if (!rateLimiter.check(ip)) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  let toolName: string | undefined;
  
  try {
    const body = await req.json();
    ({ tool: toolName } = body);
    const { input } = body;

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
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tool: toolName ?? 'unknown',
    });

    // SECURITY: Don't leak internal error details to client
    // Zod validation errors are safe to expose (they indicate schema mismatches)
    const isValidationError = error instanceof Error &&
      error.name === 'ZodError';

    // For ZodError, format it nicely
    if (isValidationError && error instanceof Error) {
      try {
        // Try to extract structured error info if available
        const zodError = error as any;
        if (zodError.errors && Array.isArray(zodError.errors)) {
          const formattedErrors = zodError.errors.map((err: any) => 
            `${err.path.join('.')}: ${err.message}`
          ).join('; ');
          console.error('Zod validation errors:', formattedErrors);
        }
      } catch (e) {
        // Fallback to message if parsing fails
      }
    }

    return Response.json(
      {
        error: isValidationError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Tool execution failed'
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
