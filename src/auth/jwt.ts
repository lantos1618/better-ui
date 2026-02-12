/**
 * JWT authentication helper.
 * Uses `jose` (dynamically imported — zero cost if unused).
 */

export interface JwtAuthOptions {
  /** JWT secret (string or Uint8Array) */
  secret: string | Uint8Array;
  /** Allowed algorithms (default: ['HS256']) */
  algorithms?: string[];
  /** Expected issuer */
  issuer?: string;
  /** Expected audience */
  audience?: string;
}

/**
 * Creates an auth callback that verifies JWT Bearer tokens.
 * Compatible with the `auth` option in createNextJSToolHandler / createExpressToolHandler.
 */
export function jwtAuth(options: JwtAuthOptions) {
  return async (headers: Headers): Promise<Record<string, unknown>> => {
    const authHeader = headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const { jwtVerify } = await import('jose');

    const secret = typeof options.secret === 'string'
      ? new TextEncoder().encode(options.secret)
      : options.secret;

    const { payload } = await jwtVerify(token, secret, {
      algorithms: options.algorithms as any,
      issuer: options.issuer,
      audience: options.audience,
    });

    return payload as Record<string, unknown>;
  };
}
