/**
 * Auth module tests — jwtAuth, sessionAuth, betterAuth.
 *
 * NOTE ON JOSE: `jose@6` ships as pure ESM. Under this repo's ts-jest (CommonJS)
 * config, the `await import('jose')` inside jwtAuth is downleveled to require()
 * and jose's ESM entry cannot be required. So we mock `jose` with a faithful
 * HS256/HS512 `jwtVerify` backed by node:crypto that enforces the same contract
 * jwtAuth depends on (signature, `exp`, `requiredClaims`, `algorithms`, issuer,
 * audience, `maxTokenAge`). Tokens are minted with real HMAC signatures, so the
 * accept/reject outcomes genuinely test jwtAuth's option plumbing — e.g. if
 * jwtAuth stopped passing `requiredClaims: ['exp']`, the "no exp" test would
 * fail. When the jest ESM config is fixed, this mock still overrides jose.
 */

jest.mock('jose', () => {
  const crypto = require('crypto');
  const HMAC: Record<string, string> = { HS256: 'sha256', HS512: 'sha512' };

  const b64urlToBuf = (s: string) =>
    Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const decodeJson = (s: string) => JSON.parse(b64urlToBuf(s).toString('utf8'));

  const toSeconds = (age: string | number): number => {
    if (typeof age === 'number') return age;
    const m = /^(\d+)\s*(s|m|h|d)?$/.exec(age.trim());
    if (!m) throw new Error(`Invalid maxTokenAge: ${age}`);
    const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return Number(m[1]) * units[m[2] ?? 's'];
  };

  return {
    jwtVerify: async (
      token: string,
      secret: Uint8Array | string,
      options: any = {}
    ) => {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid Compact JWS');
      const [h, p, sig] = parts;
      const header = decodeJson(h);
      const payload = decodeJson(p);

      if (options.algorithms && !options.algorithms.includes(header.alg)) {
        throw new Error(`"alg" (${header.alg}) not allowed`);
      }
      const hashAlg = HMAC[header.alg];
      if (!hashAlg) throw new Error(`Unsupported "alg": ${header.alg}`);

      const key = Buffer.from(secret as any);
      const expected = crypto
        .createHmac(hashAlg, key)
        .update(`${h}.${p}`)
        .digest();
      const actual = b64urlToBuf(sig);
      if (
        expected.length !== actual.length ||
        !crypto.timingSafeEqual(expected, actual)
      ) {
        throw new Error('signature verification failed');
      }

      const now = Math.floor(Date.now() / 1000);
      for (const claim of options.requiredClaims ?? []) {
        if (!(claim in payload)) {
          throw new Error(`missing required "${claim}" claim`);
        }
      }
      if (payload.exp !== undefined && now >= payload.exp) {
        throw new Error('"exp" claim timestamp check failed');
      }
      if (options.issuer !== undefined && payload.iss !== options.issuer) {
        throw new Error('unexpected "iss" claim value');
      }
      if (options.audience !== undefined) {
        const aud = payload.aud;
        const ok = Array.isArray(aud)
          ? aud.includes(options.audience)
          : aud === options.audience;
        if (!ok) throw new Error('unexpected "aud" claim value');
      }
      if (options.maxTokenAge !== undefined) {
        if (payload.iat === undefined) throw new Error('"iat" claim missing');
        if (now - payload.iat > toSeconds(options.maxTokenAge)) {
          throw new Error('"iat" claim timestamp check failed (too old)');
        }
      }
      return { payload, protectedHeader: header };
    },
  };
});

import crypto from 'crypto';
import { jwtAuth } from '../auth/jwt';
import { sessionAuth } from '../auth/session';
import { betterAuth, BetterAuthInstance } from '../auth/better-auth';

// >= 32 bytes so the secret-strength check passes.
const SECRET = 'test-secret-that-is-at-least-32-bytes-long!!';

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

/** Mint a real HS256/HS512 JWT. Pass `exp: false` to omit the expiration claim. */
function mintToken(
  claims: Record<string, unknown> = {},
  opts: {
    alg?: 'HS256' | 'HS512';
    exp?: number | false;
    iat?: number;
  } = {}
): string {
  const alg = opts.alg ?? 'HS256';
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iat: opts.iat ?? now,
    ...claims,
  };
  if (opts.exp !== false) payload.exp = opts.exp ?? now + 3600;

  const header = b64url(JSON.stringify({ alg, typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const hash = alg === 'HS512' ? 'sha512' : 'sha256';
  const sig = b64url(crypto.createHmac(hash, SECRET).update(data).digest());
  return `${data}.${sig}`;
}

const bearer = (token: string) =>
  new Headers({ authorization: `Bearer ${token}` });

describe('jwtAuth', () => {
  it('accepts a valid token and returns the payload', async () => {
    const auth = jwtAuth({ secret: SECRET });
    const token = mintToken({ sub: 'user-1', role: 'admin' });

    const payload = await auth(bearer(token));

    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('admin');
    expect(payload.exp).toEqual(expect.any(Number));
  });

  it('rejects a missing Authorization header', async () => {
    const auth = jwtAuth({ secret: SECRET });
    await expect(auth(new Headers())).rejects.toThrow(
      /Missing or invalid Authorization header/
    );
  });

  it('rejects a malformed Authorization header (no Bearer prefix)', async () => {
    const auth = jwtAuth({ secret: SECRET });
    const token = mintToken();
    await expect(
      auth(new Headers({ authorization: token }))
    ).rejects.toThrow(/Missing or invalid Authorization header/);
  });

  it('rejects a token with a tampered signature', async () => {
    const auth = jwtAuth({ secret: SECRET });
    const token = mintToken({ sub: 'x' });
    await expect(auth(bearer(token + 'tamper'))).rejects.toThrow(
      /signature verification failed/
    );
  });

  it('rejects an expired token', async () => {
    const auth = jwtAuth({ secret: SECRET });
    const token = mintToken({ sub: 'x' }, { iat: 1000, exp: 2000 });
    await expect(auth(bearer(token))).rejects.toThrow(/exp/);
  });

  it('rejects a token without an exp claim by default', async () => {
    const auth = jwtAuth({ secret: SECRET });
    const token = mintToken({ sub: 'no-exp' }, { exp: false });
    await expect(auth(bearer(token))).rejects.toThrow(/exp/);
  });

  it('accepts a token without exp when requireExpiration is false', async () => {
    const auth = jwtAuth({ secret: SECRET, requireExpiration: false });
    const token = mintToken({ sub: 'no-exp' }, { exp: false });

    const payload = await auth(bearer(token));
    expect(payload.sub).toBe('no-exp');
    expect(payload.exp).toBeUndefined();
  });

  it('rejects a token signed with a disallowed algorithm', async () => {
    const auth = jwtAuth({ secret: SECRET }); // defaults to ['HS256']
    const token = mintToken({ sub: 'x' }, { alg: 'HS512' });
    await expect(auth(bearer(token))).rejects.toThrow(/not allowed/);
  });

  it('honors a custom algorithms allowlist', async () => {
    const auth = jwtAuth({ secret: SECRET, algorithms: ['HS512'] });
    const token = mintToken({ sub: 'x' }, { alg: 'HS512' });
    const payload = await auth(bearer(token));
    expect(payload.sub).toBe('x');
  });

  it('rejects an issuer mismatch', async () => {
    const auth = jwtAuth({ secret: SECRET, issuer: 'expected-issuer' });
    const token = mintToken({ sub: 'x', iss: 'other-issuer' });
    await expect(auth(bearer(token))).rejects.toThrow(/iss/);
  });

  it('rejects an audience mismatch', async () => {
    const auth = jwtAuth({ secret: SECRET, audience: 'expected-aud' });
    const token = mintToken({ sub: 'x', aud: 'other-aud' });
    await expect(auth(bearer(token))).rejects.toThrow(/aud/);
  });

  it('accepts matching issuer and audience', async () => {
    const auth = jwtAuth({
      secret: SECRET,
      issuer: 'my-iss',
      audience: 'my-aud',
    });
    const token = mintToken({ sub: 'x', iss: 'my-iss', aud: 'my-aud' });
    const payload = await auth(bearer(token));
    expect(payload.sub).toBe('x');
  });

  it('rejects a token older than maxTokenAge', async () => {
    const auth = jwtAuth({ secret: SECRET, maxTokenAge: '1h' });
    // Issued long ago; exp is far in the future so only maxTokenAge trips it.
    const token = mintToken({ sub: 'x' }, { iat: 1000, exp: 4102444800 });
    await expect(auth(bearer(token))).rejects.toThrow(/iat/);
  });

  it('throws when the secret is shorter than 32 bytes', () => {
    expect(() => jwtAuth({ secret: 'too-short' })).toThrow(/secret is too short/i);
  });

  it('throws for a short Uint8Array secret', () => {
    expect(() => jwtAuth({ secret: new Uint8Array(16) })).toThrow(
      /secret is too short/i
    );
  });
});

describe('sessionAuth', () => {
  it('extracts the cookie and returns verified data (happy path)', async () => {
    const auth = sessionAuth({
      verify: async (token) => ({ userId: `u-${token}` }),
    });
    const headers = new Headers({ cookie: 'session=abc123' });

    const result = await auth(headers);
    expect(result.userId).toBe('u-abc123');
  });

  it('supports a custom cookie name', async () => {
    const auth = sessionAuth({
      cookieName: 'sid',
      verify: async (token) => ({ token }),
    });
    const headers = new Headers({ cookie: 'sid=xyz; other=1' });
    const result = await auth(headers);
    expect(result.token).toBe('xyz');
  });

  it('rejects when no cookie header is present', async () => {
    const auth = sessionAuth({ verify: async () => ({}) });
    await expect(auth(new Headers())).rejects.toThrow(/No cookies present/);
  });

  it('rejects when the named cookie is missing', async () => {
    const auth = sessionAuth({ verify: async () => ({}) });
    const headers = new Headers({ cookie: 'other=1; another=2' });
    await expect(auth(headers)).rejects.toThrow(
      /Session cookie "session" not found/
    );
  });

  it('propagates a null result from verify()', async () => {
    const auth = sessionAuth({ verify: async () => null as any });
    const headers = new Headers({ cookie: 'session=tok' });
    await expect(auth(headers)).resolves.toBeNull();
  });

  it('propagates a rejection from verify()', async () => {
    const auth = sessionAuth({
      verify: async () => {
        throw new Error('invalid session');
      },
    });
    const headers = new Headers({ cookie: 'session=tok' });
    await expect(auth(headers)).rejects.toThrow(/invalid session/);
  });

  it('does not pollute Object.prototype via a __proto__ cookie name', async () => {
    let received: string | undefined;
    const auth = sessionAuth({
      cookieName: '__proto__',
      verify: async (token) => {
        received = token;
        return { ok: true };
      },
    });
    const headers = new Headers({ cookie: '__proto__=evil; session=real' });

    const result = await auth(headers);
    // With a null-prototype accumulator the value is a normal own property...
    expect(received).toBe('evil');
    expect(result.ok).toBe(true);
    // ...and the global prototype is never touched.
    expect(({} as any).evil).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('evil');
  });
});

describe('betterAuth', () => {
  it('returns session and user when a session is present', async () => {
    const instance: BetterAuthInstance = {
      api: {
        getSession: async () => ({
          session: { id: 'sess-1' },
          user: { id: 'user-1', email: 'a@b.com' },
        }),
      },
    };
    const auth = betterAuth(instance);
    const result = await auth(new Headers());

    expect(result.session).toEqual({ id: 'sess-1' });
    expect(result.user).toEqual({ id: 'user-1', email: 'a@b.com' });
  });

  it('rejects when there is no active session', async () => {
    const instance: BetterAuthInstance = {
      api: {
        getSession: async () => ({ session: null, user: null }),
      },
    };
    const auth = betterAuth(instance);
    await expect(auth(new Headers())).rejects.toThrow(/No active session/);
  });

  it('rejects when getSession returns null', async () => {
    const instance: BetterAuthInstance = {
      api: { getSession: async () => null },
    };
    const auth = betterAuth(instance);
    await expect(auth(new Headers())).rejects.toThrow(/No active session/);
  });
});
