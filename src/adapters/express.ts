/**
 * Express adapter for Better UI
 * Provides Express-specific tool execution and utilities for Vite/standalone usage
 */

import { Tool, ToolContext } from '../tool';
import { createRateLimiter, RateLimiter } from '../../lib/rate-limiter';

// Dynamic imports for optional dependencies
declare function require(id: string): any;

type ExpressRequest = any;
type ExpressResponse = any;

// Import Express types dynamically
let ExpressRequestImpl: any;
let ExpressResponseImpl: any;

try {
  const express = require('express');
  ExpressRequestImpl = express.Request;
  ExpressResponseImpl = express.Response;
} catch (error) {
  // Express not available, will be handled at runtime
}

// Re-export types if available
export const ExpressRequest = ExpressRequestImpl;
export const ExpressResponse = ExpressResponseImpl;

/**
 * Express-specific tool execution context
 */
export interface ExpressToolContext extends ToolContext {
  /** Express request object */
  request: ExpressRequest;
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
    auth?: (req: ExpressRequest) => Promise<ExpressToolContext['user']>;
    /** Custom error handler */
    onError?: (error: Error, req: ExpressRequest, res: ExpressResponse) => void;
  } = {}
) {
  const rateLimiter = options.rateLimiter || createRateLimiter(options.rateLimit);

  return async function handler(req: ExpressRequest, res: ExpressResponse) {
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

      // Create Express-specific context
      const context: ExpressToolContext = {
        isServer: true,
        request: req,
        headers: req.headers,
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
 * Extract user information from Express request
 */
export async function extractUserFromExpressHeaders(req: ExpressRequest): Promise<ExpressToolContext['user']> {
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

  return async function middleware(req: ExpressRequest, res: ExpressResponse, next: Function) {
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
