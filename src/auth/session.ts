/**
 * Cookie-based session authentication helper.
 */

export interface SessionAuthOptions {
  /** Cookie name to extract (default: 'session') */
  cookieName?: string;
  /**
   * Verification function — receives the cookie value, returns user/session data.
   *
   * SECURITY: if your implementation compares the incoming token against a
   * known value directly, use a constant-time comparison
   * (`crypto.timingSafeEqual`) rather than `===` to avoid leaking the token
   * through timing side-channels.
   */
  verify: (sessionToken: string) => Promise<Record<string, unknown>>;
}

/**
 * Creates an auth callback that extracts and verifies a session cookie.
 * Compatible with the `auth` option in createNextJSToolHandler / createExpressToolHandler.
 */
export function sessionAuth(options: SessionAuthOptions) {
  const cookieName = options.cookieName ?? 'session';

  return async (headers: Headers): Promise<Record<string, unknown>> => {
    const cookieHeader = headers.get('cookie');
    if (!cookieHeader) {
      throw new Error('No cookies present');
    }

    const cookies = parseCookies(cookieHeader);
    const token = cookies[cookieName];
    if (!token) {
      throw new Error(`Session cookie "${cookieName}" not found`);
    }

    return options.verify(token);
  };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  // Use a null-prototype object so attacker-controlled cookie names like
  // `__proto__` can't pollute the prototype chain or shadow inherited members.
  const cookies: Record<string, string> = Object.create(null);
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.split('=');
    const name = key?.trim();
    if (name) {
      cookies[name] = rest.join('=').trim();
    }
  }
  return cookies;
}
