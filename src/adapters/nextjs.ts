/**
 * Next.js adapter for Better UI
 * Provides Next.js-specific tool execution and utilities
 */

import { Tool, ToolContext } from '../tool';
import { createRateLimiter, RateLimiter } from '../../lib/rate-limiter';

// Dynamic imports for optional dependencies
declare function require(id: string): any;

type NextRequest = any;
type NextResponse = any;

// Import Next.js types dynamically
let NextRequestImpl: any;
let NextResponseImpl: any;

try {
  const nextServer = require('next/server');
  NextRequestImpl = nextServer.NextRequest;
  NextResponseImpl = nextServer.NextResponse;
} catch (error) {
  // Next.js not available, will be handled at runtime
}

// Re-export types if available
export const NextRequest = NextRequestImpl;
export const NextResponse = NextResponseImpl;

/**
 * Next.js-specific tool execution context
 */
export interface NextJSToolContext extends ToolContext {
  /** Next.js request object */
  request: NextRequest;
  /** Extracted user information from request */
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

/**
 * Create a Next.js API route handler for tool execution
 * 
 * @param tools - Map of tools to expose
 * @param options - Configuration options
 * @returns Next.js API route handler
 * 
 * @example
 * ```typescript
 * import { createNextJSToolHandler } from '@lantos1618/better-ui/adapters/nextjs';
 * import { myTools } from '@/lib/tools';
 * 
 * export const POST = createNextJSToolHandler(myTools, {
 *   rateLimit: { maxRequests: 10, windowMs: 60000 }
 * });
 * ```
 */
export function createNextJSToolHandler(
  tools: Record<string, Tool>,
  options: {
    /** Rate limiting configuration */
    rateLimit?: {
      maxRequests: number;
      windowMs: number;
    };
    /** Custom rate limiter instance */
    rateLimiter?: RateLimiter;
    /** Authentication middleware */
    auth?: (req: NextRequest) => Promise<NextJSToolContext['user']>;
    /** Custom error handler */
    onError?: (error: Error, req: NextRequest) => NextResponse;
  } = {}
) {
  const rateLimiter = options.rateLimiter || createRateLimiter(options.rateLimit);

  return async function handler(req: NextRequest) {
    try {
      // Extract IP for rate limiting
      const forwardedFor = req.headers.get('x-forwarded-for');
      const ip = forwardedFor?.split(',')[0]?.trim() || 
                 req.headers.get('x-real-ip') || 
                 'anonymous';

      // Apply rate limiting
      if (rateLimiter && !await rateLimiter.check(ip)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }

      // Extract user information if auth middleware provided
      let user: NextJSToolContext['user'] | undefined;
      if (options.auth) {
        try {
          user = await options.auth(req);
        } catch (authError) {
          return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 401 }
          );
        }
      }

      // Parse request body
      const body = await req.json();
      const { tool: toolName, input } = body;

      if (!toolName) {
        return NextResponse.json(
          { error: 'Missing tool name' },
          { status: 400 }
        );
      }

      if (input === undefined) {
        return NextResponse.json(
          { error: 'Missing input' },
          { status: 400 }
        );
      }

      const tool = tools[toolName as keyof typeof tools];
      if (!tool) {
        // SECURITY: Don't reveal which tools exist in error messages
        return NextResponse.json(
          { error: 'Tool not found' },
          { status: 404 }
        );
      }

      // Create Next.js-specific context
      const context: NextJSToolContext = {
        isServer: true,
        request: req,
        headers: req.headers,
        cache: new Map(),
        fetch: globalThis.fetch?.bind(globalThis),
        user,
      };

      // Execute the tool
      const result = await tool.run(input, context);

      return NextResponse.json({ result });
    } catch (error) {
      // Log full error server-side for debugging
      console.error('Next.js tool execution error:', error);

      // Use custom error handler if provided
      if (options.onError) {
        return options.onError(error as Error, req);
      }

      // Default error handling
      const isValidationError = error instanceof Error &&
        error.name === 'ZodError';

      return NextResponse.json(
        {
          error: isValidationError
            ? error.message
            : 'Tool execution failed'
        },
        {
          status: isValidationError ? 400 : 500
        }
      );
    }
  };
}

/**
 * Extract common user information from Next.js request headers
 * This is a helper function - you should implement your own auth logic
 */
export async function extractUserFromHeaders(req: NextRequest): Promise<NextJSToolContext['user']> {
  const authHeader = req.headers.get('authorization');
  const userHeader = req.headers.get('x-user');
  
  if (!authHeader && !userHeader) {
    return undefined;
  }

  // Basic example - implement your own auth logic
  if (userHeader) {
    try {
      return JSON.parse(userHeader);
    } catch {
      return undefined;
    }
  }

  // Example: Extract from JWT token (implement your own logic)
  if (authHeader?.startsWith('Bearer ')) {
    // const token = authHeader.substring(7);
    // return verifyJWT(token); // Implement your JWT verification
    return undefined;
  }

  return undefined;
}

/**
 * Create a chat API route handler for Better UI tools
 * Compatible with Vercel AI SDK
 */
export function createNextJSChatHandler(
  tools: Record<string, Tool>,
  options: {
    /** AI model to use */
    model?: string;
    /** Maximum steps (tool calls) allowed */
    maxSteps?: number;
    /** Custom rate limiter */
    rateLimiter?: RateLimiter;
    /** Authentication middleware */
    auth?: (req: NextRequest) => Promise<NextJSToolContext['user']>;
  } = {}
) {
  return async function handler(req: NextRequest) {
    try {
      // Import AI SDK dynamically to avoid dependency
      const { streamText, stepCountIs, convertToModelMessages } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');

      const { messages } = await req.json();
      const modelMessages = convertToModelMessages(messages);

      const result = await streamText({
        model: openai(options.model || 'gpt-4o-mini'),
        messages: modelMessages,
        tools: Object.fromEntries(
          Object.entries(tools).map(([name, tool]) => [name, tool.toAITool()])
        ),
        stopWhen: options.maxSteps ? stepCountIs(options.maxSteps) : undefined,
      });

      return result.toUIMessageStreamResponse();
    } catch (error) {
      console.error('Next.js chat handler error:', error);
      return NextResponse.json(
        { error: 'Chat execution failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for Better UI tools in Next.js
 * Can be used in next.config.js or as a separate middleware file
 */
export function createNextJSMiddleware(options: {
  /** Tools to protect */
  tools: Record<string, Tool>;
  /** Rate limiting */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /** Authentication required */
  requireAuth?: boolean;
}) {
  const rateLimiter = options.rateLimit ? createRateLimiter(options.rateLimit) : undefined;

  return async function middleware(req: NextRequest) {
    const url = req.nextUrl.pathname;
    
    // Only protect tool endpoints
    if (!url.startsWith('/api/tools/') && !url.startsWith('/api/chat')) {
      return NextResponse.next();
    }

    // Apply rate limiting
    if (rateLimiter) {
      const forwardedFor = req.headers.get('x-forwarded-for');
      const ip = forwardedFor?.split(',')[0]?.trim() || 'anonymous';
      
      if (!await rateLimiter.check(ip)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
    }

    // Check authentication if required
    if (options.requireAuth) {
      const user = await extractUserFromHeaders(req);
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    return NextResponse.next();
  };
}
