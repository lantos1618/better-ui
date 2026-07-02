/**
 * MCP (Model Context Protocol) Server for Better UI
 *
 * Exposes registered Better UI tools as MCP tools, allowing any MCP-compatible
 * client (Claude Desktop, Cursor, VS Code, etc.) to discover and call them.
 *
 * Protocol: JSON-RPC 2.0 over stdio (newline-delimited JSON)
 *
 * @example
 * ```typescript
 * import { createMCPServer } from '@lantos1618/better-ui/mcp';
 * import { weatherTool, searchTool } from './tools';
 *
 * const server = createMCPServer({
 *   name: 'my-tools',
 *   version: '1.0.0',
 *   tools: { weather: weatherTool, search: searchTool },
 * });
 *
 * server.start(); // Listens on stdin/stdout
 * ```
 */

import type { Tool, ToolContext } from '../tool';
import { zodToJsonSchema } from './schema';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MCPServerConfig {
  /** Server name exposed to MCP clients */
  name: string;
  /** Server version */
  version: string;
  /** Tool registry — keys are tool names */
  tools: Record<string, Tool>;
  /** Optional context passed to every tool execution */
  context?: Partial<ToolContext>;
  /** Called when the server starts */
  onStart?: () => void;
  /** Called on errors */
  onError?: (error: Error) => void;
  /**
   * Allowlist of permitted `Origin` header values for HTTP transports.
   * Requests without an `Origin` header (non-browser clients) are always allowed.
   * When set, a browser request is allowed only if its Origin is in this list.
   * When omitted, a browser request is allowed only if its Origin matches the request Host (same-origin).
   * Guards against DNS-rebinding / CSRF attacks (MCP spec requirement).
   */
  allowedOrigins?: string[];
  /**
   * Authentication/authorization hook run before a tool executes over HTTP.
   * Throw to reject the call — the tool will not run and a JSON-RPC error (HTTP 401) is returned.
   */
  onBeforeExecute?: (toolName: string, args: unknown, req: Request) => void | Promise<void>;
  /** Maximum accepted HTTP request body size in bytes (default: 1 MiB). Oversized requests get HTTP 413. */
  maxBodyBytes?: number;
  /** Maximum accepted length of a single stdio line in bytes (default: 10 MiB). Overflow resets the buffer with a parse error. */
  maxLineBytes?: number;
  /** When true, echo raw error details to clients. When false (default), return generic messages and log details server-side. */
  debug?: boolean;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

interface MCPToolSchema {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

// MCP error codes
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;
// Custom (server) error code for authentication/authorization failures
const UNAUTHORIZED = -32001;

// Defaults for resource limits
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024; // 1 MiB
const DEFAULT_MAX_LINE_BYTES = 10 * 1024 * 1024; // 10 MiB

/**
 * Validate the `Origin` header against DNS-rebinding / CSRF attacks.
 * - No Origin header (non-browser client) → allowed.
 * - Allowlist configured → allowed only if Origin is present in it.
 * - No allowlist → allowed only if Origin's host matches the request Host (same-origin).
 */
function isOriginAllowed(req: Request, allowedOrigins?: string[]): boolean {
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

/**
 * Read a request body as JSON with an upper size bound.
 * Rejects (via `tooLarge`) when Content-Length or the decoded text exceeds `maxBytes`.
 */
async function readCappedJson(
  req: Request,
  maxBytes: number,
): Promise<{ value?: unknown; tooLarge?: boolean; parseError?: boolean }> {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const len = Number(contentLength);
    if (Number.isFinite(len) && len > maxBytes) return { tooLarge: true };
  }
  const text = await req.text();
  if (text.length > maxBytes) return { tooLarge: true };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { parseError: true };
  }
}

// ─── MCPServer ───────────────────────────────────────────────────────────────

export class MCPServer {
  private config: MCPServerConfig;
  private initialized = false;
  private running = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /** Start listening on stdin for JSON-RPC messages */
  start(): void {
    if (this.running) return;
    this.running = true;

    const stdin = process.stdin;
    const stdout = process.stdout;

    stdin.setEncoding('utf-8');

    let buffer = '';
    const maxLineBytes = this.config.maxLineBytes ?? DEFAULT_MAX_LINE_BYTES;

    stdin.on('data', (chunk: string) => {
      buffer += chunk;

      // Process complete lines
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (!line) continue;

        this.handleLine(line)
          .then((response) => {
            if (response) {
              stdout.write(JSON.stringify(response) + '\n');
            }
          })
          .catch((err) => {
            const errorResponse: JsonRpcResponse = {
              jsonrpc: '2.0',
              id: null,
              error: { code: INTERNAL_ERROR, message: err.message },
            };
            stdout.write(JSON.stringify(errorResponse) + '\n');
            this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
          });
      }

      // Guard against an unbounded line buffer (a single oversized line with no newline).
      if (buffer.length > maxLineBytes) {
        buffer = '';
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: null,
          error: { code: PARSE_ERROR, message: 'Message exceeds maximum allowed size' },
        };
        stdout.write(JSON.stringify(errorResponse) + '\n');
        this.config.onError?.(new Error('stdio line buffer overflow'));
      }
    });

    stdin.on('end', () => {
      this.running = false;
    });

    this.config.onStart?.();
  }

  /** Stop the server */
  stop(): void {
    this.running = false;
  }

  /** Handle a single JSON-RPC message. Returns a response or null for notifications. */
  async handleMessage(message: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    // Notifications (no id) don't get responses
    if (message.id === undefined || message.id === null) {
      if (message.method === 'notifications/initialized') {
        // Client acknowledged initialization
      }
      return null;
    }

    switch (message.method) {
      case 'initialize':
        return this.handleInitialize(message);
      case 'tools/list':
        return this.handleToolsList(message);
      case 'tools/call':
        return this.handleToolsCall(message);
      case 'ping':
        return { jsonrpc: '2.0', id: message.id, result: {} };
      default:
        return {
          jsonrpc: '2.0',
          id: message.id,
          error: { code: METHOD_NOT_FOUND, message: `Method not found: ${message.method}` },
        };
    }
  }

  /** Get all tools as MCP tool schemas */
  listTools(): MCPToolSchema[] {
    return Object.values(this.config.tools).map((tool) => ({
      name: tool.name,
      description: tool.description || tool.name,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    }));
  }

  /** Execute a tool by name */
  async callTool(name: string, args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Use hasOwnProperty to prevent prototype chain traversal (e.g., 'constructor', 'toString')
    if (!Object.prototype.hasOwnProperty.call(this.config.tools, name)) {
      throw new McpError(INVALID_PARAMS, `Unknown tool: ${name}`);
    }
    const tool = this.config.tools[name];

    try {
      const result = await tool.run(args, {
        isServer: true,
        ...this.config.context,
      });

      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw new McpError(INVALID_PARAMS, `Invalid input: ${error.message}`);
      }
      throw error;
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async handleLine(line: string): Promise<JsonRpcResponse | null> {
    let message: JsonRpcRequest;
    try {
      message = JSON.parse(line);
    } catch {
      return {
        jsonrpc: '2.0',
        id: null,
        error: { code: PARSE_ERROR, message: 'Parse error' },
      };
    }

    if (!message.jsonrpc || message.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: message.id ?? null,
        error: { code: INVALID_REQUEST, message: 'Invalid JSON-RPC version' },
      };
    }

    return this.handleMessage(message);
  }

  private handleInitialize(message: JsonRpcRequest): JsonRpcResponse {
    this.initialized = true;
    return {
      jsonrpc: '2.0',
      id: message.id!,
      result: {
        protocolVersion: '2025-11-25',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: this.config.name,
          version: this.config.version,
        },
      },
    };
  }

  private handleToolsList(message: JsonRpcRequest): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id: message.id!,
      result: {
        tools: this.listTools(),
      },
    };
  }

  private async handleToolsCall(message: JsonRpcRequest): Promise<JsonRpcResponse> {
    const params = message.params as { name?: string; arguments?: unknown } | undefined;
    const toolName = params?.name;
    const args = params?.arguments ?? {};

    if (!toolName) {
      return {
        jsonrpc: '2.0',
        id: message.id!,
        error: { code: INVALID_PARAMS, message: 'Missing tool name' },
      };
    }

    try {
      const result = await this.callTool(toolName, args);
      return {
        jsonrpc: '2.0',
        id: message.id!,
        result,
      };
    } catch (error) {
      if (error instanceof McpError) {
        return {
          jsonrpc: '2.0',
          id: message.id!,
          error: { code: error.code, message: error.message },
        };
      }
      // Genuine tool-execution failure. Avoid leaking internal error details unless debug is enabled.
      if (!this.config.debug) {
        console.error('[MCP] Tool execution error:', error);
      }
      const text = this.config.debug
        ? `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        : 'Tool execution failed';
      return {
        jsonrpc: '2.0',
        id: message.id!,
        result: {
          content: [{ type: 'text', text }],
          isError: true,
        },
      };
    }
  }

  /**
   * Run the configured `onBeforeExecute` hook for a `tools/call` request.
   * Returns a JSON-RPC error response (to be sent with HTTP 401) if the hook throws, otherwise null.
   */
  private async checkAuth(message: JsonRpcRequest, req: Request): Promise<JsonRpcResponse | null> {
    if (!this.config.onBeforeExecute || message.method !== 'tools/call') return null;
    const params = message.params as { name?: string; arguments?: unknown } | undefined;
    try {
      await this.config.onBeforeExecute(params?.name ?? '', params?.arguments ?? {}, req);
      return null;
    } catch (error) {
      if (!this.config.debug) {
        console.error('[MCP] Authorization failed:', error);
      }
      const msg = this.config.debug && error instanceof Error ? error.message : 'Unauthorized';
      return {
        jsonrpc: '2.0',
        id: message.id ?? null,
        error: { code: UNAUTHORIZED, message: msg },
      };
    }
  }

  /**
   * Create a Web Request handler for HTTP-based MCP transport.
   * Compatible with Next.js route handlers, Deno, Bun, Cloudflare Workers, etc.
   *
   * @example
   * ```typescript
   * // Next.js route: app/api/mcp/route.ts
   * import { server } from '@/lib/mcp';
   * export const POST = server.httpHandler();
   * ```
   */
  httpHandler(): (req: Request) => Promise<Response> {
    return async (req: Request): Promise<Response> => {
      // Validate Origin (DNS-rebinding / CSRF protection)
      if (!isOriginAllowed(req, this.config.allowedOrigins)) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: 'Origin not allowed' } },
          { status: 403 },
        );
      }

      // Validate Content-Type
      const contentType = req.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Content-Type must be application/json' } },
          { status: 400 },
        );
      }

      const body = await readCappedJson(req, this.config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES);
      if (body.tooLarge) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: 'Request body too large' } },
          { status: 413 },
        );
      }
      if (body.parseError) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Parse error' } },
          { status: 400 },
        );
      }
      const message = body.value as JsonRpcRequest;

      if (!message.jsonrpc || message.jsonrpc !== '2.0') {
        return Response.json(
          { jsonrpc: '2.0', id: message.id ?? null, error: { code: INVALID_REQUEST, message: 'Invalid JSON-RPC version' } },
          { status: 400 },
        );
      }

      // Authentication/authorization hook
      const authError = await this.checkAuth(message, req);
      if (authError) {
        return Response.json(authError, { status: 401 });
      }

      const response = await this.handleMessage(message);

      if (!response) {
        // Notification — no response body
        return new Response(null, { status: 204 });
      }

      return Response.json(response);
    };
  }

  /**
   * Create a Streamable HTTP handler (MCP spec 2025-03-26).
   * Supports both single JSON-RPC requests and SSE streaming for long-running operations.
   * Compatible with Next.js route handlers, Deno, Bun, Cloudflare Workers.
   *
   * @example
   * ```typescript
   * // Next.js route: app/api/mcp/route.ts
   * import { server } from '@/lib/mcp';
   * export const POST = server.streamableHttpHandler();
   * ```
   */
  streamableHttpHandler(): (req: Request) => Promise<Response> {
    return async (req: Request): Promise<Response> => {
      const accept = req.headers.get('accept') || '';
      const contentType = req.headers.get('content-type') || '';

      // Validate Origin (DNS-rebinding / CSRF protection)
      if (!isOriginAllowed(req, this.config.allowedOrigins)) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: 'Origin not allowed' } },
          { status: 403 },
        );
      }

      if (!contentType.includes('application/json')) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Content-Type must be application/json' } },
          { status: 400 },
        );
      }

      const body = await readCappedJson(req, this.config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES);
      if (body.tooLarge) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: 'Request body too large' } },
          { status: 413 },
        );
      }
      if (body.parseError) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Parse error' } },
          { status: 400 },
        );
      }
      const message = body.value as JsonRpcRequest;

      if (!message.jsonrpc || message.jsonrpc !== '2.0') {
        return Response.json(
          { jsonrpc: '2.0', id: message.id ?? null, error: { code: INVALID_REQUEST, message: 'Invalid JSON-RPC version' } },
          { status: 400 },
        );
      }

      // Authentication/authorization hook
      const authError = await this.checkAuth(message, req);
      if (authError) {
        return Response.json(authError, { status: 401 });
      }

      // If client accepts SSE, stream the response
      if (accept.includes('text/event-stream')) {
        const encoder = new TextEncoder();
        const self = this;
        const sseStream = new ReadableStream({
          async start(controller) {
            try {
              const response = await self.handleMessage(message);
              if (response) {
                controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(response)}\n\n`));
              }
            } catch (err) {
              if (!self.config.debug) {
                console.error('[MCP] Streamable handler error:', err);
              }
              const errorResponse: JsonRpcResponse = {
                jsonrpc: '2.0',
                id: message.id ?? null,
                error: {
                  code: INTERNAL_ERROR,
                  message: self.config.debug && err instanceof Error ? err.message : 'Internal error',
                },
              };
              controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(errorResponse)}\n\n`));
            }
            controller.close();
          },
        });

        return new Response(sseStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      }

      // Standard JSON response
      const response = await this.handleMessage(message);
      if (!response) {
        return new Response(null, { status: 204 });
      }
      return Response.json(response);
    };
  }
}

class McpError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'McpError';
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create an MCP server from a Better UI tool registry.
 *
 * @example
 * ```typescript
 * const server = createMCPServer({
 *   name: 'my-app',
 *   version: '1.0.0',
 *   tools: { weather: weatherTool, search: searchTool },
 * });
 *
 * // For stdio transport (Claude Desktop, etc.)
 * server.start();
 * ```
 */
export function createMCPServer(config: MCPServerConfig): MCPServer {
  return new MCPServer(config);
}
