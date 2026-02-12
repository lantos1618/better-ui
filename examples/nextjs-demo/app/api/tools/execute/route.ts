import { tools } from '@/lib/tools';
import { rateLimiter } from '@/lib/rate-limiter';
import { auditLogger, createAuditEntry } from '@/lib/audit';

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

    // HITL guard: block tools that require confirmation for this specific input.
    // Tools with conditional confirm (function) are only blocked when shouldConfirm returns true.
    if (tool.requiresConfirmation && tool.shouldConfirm(input)) {
      auditLogger.log(
        createAuditEntry('tool_blocked', toolName, ip).finish(false, 'HITL bypass attempt')
      );
      return Response.json(
        { error: 'This tool requires confirmation. Use /api/tools/confirm.' },
        { status: 403 }
      );
    }

    // Execute the tool server-side with proper context
    // SECURITY: isServer=true ensures server handler runs, not client
    const audit = createAuditEntry('tool_execute', toolName, ip);
    const result = await tool.run(input, {
      isServer: true,
      // Add request context for server handlers that need it
      headers: req.headers,
      // NOTE: Add authentication/session context here if needed:
      // user: await getUser(req),
      // session: await getSession(req),
    });

    auditLogger.log(audit.finish(true));
    return Response.json({ result });
  } catch (error) {
    // Log full error server-side for debugging
    // Note: avoid passing raw Zod errors to console.error — some loggers
    // fail to serialize them. Extract safe properties instead.
    console.error('Tool execution error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tool: toolName ?? 'unknown',
    });

    if (toolName) {
      auditLogger.log(
        createAuditEntry('tool_execute', toolName, ip).finish(
          false,
          error instanceof Error ? error.message : 'Tool execution failed'
        )
      );
    }

    // SECURITY: Don't leak internal error details to client
    // Zod validation errors are safe to expose (they indicate schema mismatches)
    const isValidationError = error instanceof Error &&
      error.name === 'ZodError';

    // For ZodError, format it nicely
    if (isValidationError && error instanceof Error) {
      try {
        const zodError = error as { errors?: Array<{ path: string[]; message: string }> };
        if (zodError.errors && Array.isArray(zodError.errors)) {
          const formattedErrors = zodError.errors.map((err) =>
            `${err.path.join('.')}: ${err.message}`
          ).join('; ');
          console.error('Zod validation errors:', formattedErrors);
        }
      } catch {
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
