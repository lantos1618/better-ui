/**
 * Express adapter for Better UI
 * Provides Express-specific tool execution and utilities for Vite/standalone usage
 */

import { Tool, ToolContext } from '../tool';
import { createRateLimiter, RateLimiter } from '../../lib/rate-limiter';

// Minimal interfaces for Express types to avoid hard dependency on express package.
interface ExpressRequestLike {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
  connection?: { remoteAddress?: string };
  socket?: { remoteAddress?: string };
  path?: string;
  url?: string;
}

interface ExpressResponseLike {
  status(code: number): ExpressResponseLike;
  json(body: unknown): void;
}

/**
 * Express-specific tool execution context
 */
export interface ExpressToolContext extends ToolContext {
  /** Express request object */
  request: ExpressRequestLike;
  /** Extracted user information from request */
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

/**
 * Create an Express route handler for tool execution
 */
export function createExpressToolHandler(
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
    auth?: (req: ExpressRequestLike) => Promise<ExpressToolContext['user']>;
    /** Custom error handler */
    onError?: (error: Error, req: ExpressRequestLike, res: ExpressResponseLike) => void;
  } = {}
) {
  const rateLimiter = options.rateLimiter || createRateLimiter(options.rateLimit);

  return async function handler(req: ExpressRequestLike, res: ExpressResponseLike) {
    try {
      // Extract IP for rate limiting
      const ip = req.ip || 
                req.connection?.remoteAddress || 
                req.socket?.remoteAddress || 
                'anonymous';

      // Apply rate limiting
      if (rateLimiter) {
        const allowed = await rateLimiter.check(ip);
        if (!allowed) {
          return res.status(429).json({ error: 'Rate limit exceeded' });
        }
      }

      // Extract user information if auth middleware provided
      let user: ExpressToolContext['user'] | undefined;
      if (options.auth) {
        try {
          user = await options.auth(req);
        } catch (authError) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
      }

      const { tool: toolName, input } = req.body;

      if (!toolName) {
        return res.status(400).json({ error: 'Missing tool name' });
      }

      if (input === undefined) {
        return res.status(400).json({ error: 'Missing input' });
      }

      const tool = tools[toolName as keyof typeof tools];
      if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
      }

      // HITL guard: block confirm-required tools on the execute handler
      if (tool.requiresConfirmation) {
        return res.status(403).json({
          error: 'This tool requires confirmation. Use the confirm handler.',
        });
      }

      // Create Express-specific context
      const context: ExpressToolContext = {
        isServer: true,
        request: req,
        headers: new Headers(req.headers as Record<string, string>),
        cache: new Map(),
        fetch: globalThis.fetch?.bind(globalThis),
        user,
      };

      // Execute tool
      const result = await tool.run(input, context);

      return res.json({ result });
    } catch (error) {
      console.error('Express tool execution error:', error);

      if (options.onError) {
        return options.onError(error as Error, req, res);
      }

      const isValidationError = error instanceof Error &&
        error.name === 'ZodError';

      return res.status(isValidationError ? 400 : 500).json({
        error: isValidationError
          ? error.message
          : 'Tool execution failed'
      });
    }
  };
}

/**
 * Create an Express route handler for confirmed tool execution (HITL)
 *
 * Only accepts tools where `requiresConfirmation === true`.
 * Default stricter rate limit (5 req/10s).
 */
export function createExpressConfirmHandler(
  tools: Record<string, Tool>,
  options: {
    rateLimit?: { maxRequests: number; windowMs: number };
    rateLimiter?: RateLimiter;
    auth?: (req: ExpressRequestLike) => Promise<ExpressToolContext['user']>;
    onError?: (error: Error, req: ExpressRequestLike, res: ExpressResponseLike) => void;
  } = {}
) {
  const rateLimiter = options.rateLimiter || createRateLimiter(
    options.rateLimit ?? { maxRequests: 5, windowMs: 10_000 }
  );

  return async function handler(req: ExpressRequestLike, res: ExpressResponseLike) {
    try {
      const ip = req.ip ||
                req.connection?.remoteAddress ||
                req.socket?.remoteAddress ||
                'anonymous';

      if (rateLimiter) {
        const allowed = await rateLimiter.check(ip);
        if (!allowed) {
          return res.status(429).json({ error: 'Rate limit exceeded' });
        }
      }

      let user: ExpressToolContext['user'] | undefined;
      if (options.auth) {
        try {
          user = await options.auth(req);
        } catch {
          return res.status(401).json({ error: 'Authentication failed' });
        }
      }

      const { tool: toolName, input } = req.body;

      if (!toolName) {
        return res.status(400).json({ error: 'Missing tool name' });
      }

      if (input === undefined) {
        return res.status(400).json({ error: 'Missing input' });
      }

      const tool = tools[toolName as keyof typeof tools];
      if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
      }

      // Only accept tools that require confirmation
      if (!tool.requiresConfirmation) {
        return res.status(400).json({
          error: 'This tool does not require confirmation. Use the execute handler.',
        });
      }

      const context: ExpressToolContext = {
        isServer: true,
        request: req,
        headers: new Headers(req.headers as Record<string, string>),
        cache: new Map(),
        fetch: globalThis.fetch?.bind(globalThis),
        user,
      };

      const result = await tool.run(input, context);
      return res.json({ result });
    } catch (error) {
      console.error('Express tool confirmation error:', error);

      if (options.onError) {
        return options.onError(error as Error, req, res);
      }

      const isValidationError = error instanceof Error && error.name === 'ZodError';
      return res.status(isValidationError ? 400 : 500).json({
        error: isValidationError ? error.message : 'Tool execution failed',
      });
    }
  };
}

/**
 * Extract user information from Express request
 */
export async function extractUserFromExpressHeaders(req: ExpressRequestLike): Promise<ExpressToolContext['user']> {
  const authHeader = req.headers.authorization;
  const userHeader = req.headers['x-user'];
  
  if (!authHeader && !userHeader) {
    return undefined;
  }

  if (userHeader && typeof userHeader === 'string') {
    try {
      return JSON.parse(userHeader);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Create Express middleware for Better UI tools
 */
export function createExpressMiddleware(options: {
  /** Rate limiting */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /** Authentication required */
  requireAuth?: boolean;
}) {
  const rateLimiter = options.rateLimit ? createRateLimiter(options.rateLimit) : undefined;

  return async function middleware(req: ExpressRequestLike, res: ExpressResponseLike, next: () => void) {
    const url = req.path || req.url;
    
    if (!url?.startsWith('/api/tools/') && !url?.startsWith('/api/chat')) {
      return next();
    }

    if (rateLimiter) {
      const ip = req.ip || req.connection?.remoteAddress || 'anonymous';
      
      const allowed = await rateLimiter.check(ip);
      if (!allowed) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
    }

    if (options.requireAuth) {
      const user = await extractUserFromExpressHeaders(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
    }

    return next();
  };
}
