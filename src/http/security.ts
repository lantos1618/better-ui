/**
 * Shared HTTP security helpers for Better UI server transports (MCP, AG-UI, OpenAPI).
 *
 * This module is intentionally internal — it is not a package entry point. It is
 * bundled into each transport because the entry modules import it.
 */

/** Default maximum accepted HTTP request body size in bytes (1 MiB). */
export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024; // 1 MiB

/**
 * Validate the `Origin` header against DNS-rebinding / CSRF attacks.
 * - No Origin header (non-browser client) → allowed.
 * - Allowlist configured → allowed only if Origin is present in it.
 * - No allowlist → allowed only if Origin's host matches the request Host (same-origin).
 */
export function isOriginAllowed(req: Request, allowedOrigins?: string[]): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  if (allowedOrigins && allowedOrigins.length > 0) {
    return allowedOrigins.includes(origin);
  }
  const host = req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Result of {@link readCappedJson}. Exactly one of the fields is meaningful. */
export interface CappedJsonResult {
  value?: unknown;
  tooLarge?: boolean;
  parseError?: boolean;
}

/**
 * Read a request body as JSON with an upper size bound.
 * Rejects (via `tooLarge`) when Content-Length or the decoded body's byte length
 * exceeds `maxBytes`. Byte length (UTF-8) is used consistently so the limit is
 * accurate for multibyte payloads and for bodies without a Content-Length header
 * (e.g. chunked transfer encoding).
 */
export async function readCappedJson(
  req: Request,
  maxBytes: number,
): Promise<CappedJsonResult> {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const len = Number(contentLength);
    if (Number.isFinite(len) && len > maxBytes) return { tooLarge: true };
  }
  const text = await req.text();
  // Byte-accurate (UTF-8) length via TextEncoder — portable across Node, Deno,
  // Bun, and edge/worker runtimes (where `Buffer` may be absent).
  if (new TextEncoder().encode(text).byteLength > maxBytes) return { tooLarge: true };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { parseError: true };
  }
}

/**
 * Type guard: true only for non-null, non-array JSON objects.
 * Used to reject bodies like `null`, `true`, `42`, `"str"`, or `[...]` that parse
 * successfully as JSON but are not valid request objects (which would otherwise
 * crash destructuring / property access downstream).
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
