import { tools } from '@/lib/tools';
import { createRateLimiter } from '@/lib/rate-limiter';
import { auditLogger, createAuditEntry } from '@/lib/audit';

declare const process: { env: Record<string, string | undefined> };

/**
 * Confirmed tool execution endpoint (HITL)
 *
 * Only accepts tools where `requiresConfirmation === true`.
 * Stricter rate limit than /api/tools/execute (default 5 req/10s).
 *
 * SECURITY:
 * - Only registered tools can be executed
 * - Only confirmation-required tools are accepted (400 otherwise)
 * - Server handlers run here, ensuring secrets stay server-side
 * - Input is validated by the tool's Zod schema
 * - Stricter rate limiting prevents abuse
 * - Every invocation is audit-logged
 */

const toolMap = tools;

const confirmRateLimiter = createRateLimiter({
  maxRequests: parseInt(process.env.CONFIRM_RATE_LIMIT_MAX || '5', 10),
  windowMs: parseInt(process.env.CONFIRM_RATE_LIMIT_WINDOW_MS || '10000', 10),
});

export async function POST(req: Request) {
  // Rate limiting: extract IP from headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') ||
             'anonymous';

  if (!confirmRateLimiter.check(ip)) {
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
      return Response.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    // Only accept tools that require confirmation
    if (!tool.requiresConfirmation) {
      return Response.json(
        { error: 'This tool does not require confirmation. Use /api/tools/execute.' },
        { status: 400 }
      );
    }

    const audit = createAuditEntry('tool_confirm', toolName, ip);

    const result = await tool.run(input, {
      isServer: true,
      headers: req.headers,
    });

    auditLogger.log(audit.finish(true));
    return Response.json({ result });
  } catch (error) {
    console.error('Tool confirmation error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      tool: toolName ?? 'unknown',
    });

    if (toolName) {
      auditLogger.log(
        createAuditEntry('tool_confirm', toolName, ip).finish(
          false,
          error instanceof Error ? error.message : 'Tool confirmation failed'
        )
      );
    }

    const isValidationError = error instanceof Error &&
      error.name === 'ZodError';

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
