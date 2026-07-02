/**
 * JWT authentication helper.
 * Uses `jose` (dynamically imported — zero cost if unused).
 */

/** Minimum acceptable secret length (in bytes) for HMAC-based algorithms. */
const MIN_SECRET_BYTES = 32;

export interface JwtAuthOptions {
  /** JWT secret (string or Uint8Array) */
  secret: string | Uint8Array;
  /** Allowed algorithms (default: ['HS256']) */
  algorithms?: string[];
  /** Expected issuer */
  issuer?: string;
  /** Expected audience */
  audience?: string;
  /**
   * Require tokens to carry an `exp` (expiration) claim.
   * When true (the default) tokens without `exp` are rejected — otherwise a
   * token with no expiry would be accepted forever.
   */
  requireExpiration?: boolean;
  /**
   * Maximum age of the token, measured from its `iat` (issued-at) claim.
   * Passed straight through to jose's `jwtVerify` (e.g. '2h', '30m', or a
   * number of seconds). Requires an `iat` claim to be present.
   */
  maxTokenAge?: string | number;
}

/**
 * Creates an auth callback that verifies JWT Bearer tokens.
 * Compatible with the `auth` option in createNextJSToolHandler / createExpressToolHandler.
 */
export function jwtAuth(options: JwtAuthOptions) {
  const secretBytes = typeof options.secret === 'string'
    ? new TextEncoder().encode(options.secret)
    : options.secret;

  // Reject dangerously weak secrets up front (HS256 needs >= 256 bits).
  if (secretBytes.byteLength < MIN_SECRET_BYTES) {
    throw new Error(
      `JWT secret is too short: ${secretBytes.byteLength} bytes (minimum ${MIN_SECRET_BYTES} bytes / 256 bits required)`
    );
  }

  const requireExpiration = options.requireExpiration ?? true;

  return async (headers: Headers): Promise<Record<string, unknown>> => {
    const authHeader = headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const { jwtVerify } = await import('jose');

    const { payload } = await jwtVerify(token, secretBytes, {
      algorithms: options.algorithms ?? ['HS256'],
      issuer: options.issuer,
      audience: options.audience,
      requiredClaims: requireExpiration ? ['exp'] : undefined,
      maxTokenAge: options.maxTokenAge,
    });

    return payload as Record<string, unknown>;
  };
}
