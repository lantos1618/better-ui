/**
 * BetterAuth integration helper.
 * Works with any BetterAuth instance.
 */

export interface BetterAuthInstance {
  api: {
    getSession(options: { headers: Headers }): Promise<{
      session: Record<string, unknown> | null;
      user: Record<string, unknown> | null;
    } | null>;
  };
}

/**
 * Creates an auth callback from a BetterAuth instance.
 * Compatible with the `auth` option in createNextJSToolHandler / createExpressToolHandler.
 */
export function betterAuth(authInstance: BetterAuthInstance) {
  return async (headers: Headers): Promise<Record<string, unknown>> => {
    const result = await authInstance.api.getSession({ headers });

    if (!result?.session) {
      throw new Error('No active session');
    }

    return {
      session: result.session,
      user: result.user,
    };
  };
}
