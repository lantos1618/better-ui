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
      return {
        jsonrpc: '2.0',
        id: message.id!,
        result: {
          content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
          isError: true,
        },
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
      // Validate Content-Type
      const contentType = req.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Content-Type must be application/json' } },
          { status: 400 },
        );
      }

      let message: JsonRpcRequest;
      try {
        message = await req.json();
      } catch {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Parse error' } },
          { status: 400 },
        );
      }

      if (!message.jsonrpc || message.jsonrpc !== '2.0') {
        return Response.json(
          { jsonrpc: '2.0', id: message.id ?? null, error: { code: INVALID_REQUEST, message: 'Invalid JSON-RPC version' } },
          { status: 400 },
        );
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

      if (!contentType.includes('application/json')) {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Content-Type must be application/json' } },
          { status: 400 },
        );
      }

      let message: JsonRpcRequest;
      try {
        message = await req.json();
      } catch {
        return Response.json(
          { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Parse error' } },
          { status: 400 },
        );
      }

      if (!message.jsonrpc || message.jsonrpc !== '2.0') {
        return Response.json(
          { jsonrpc: '2.0', id: message.id ?? null, error: { code: INVALID_REQUEST, message: 'Invalid JSON-RPC version' } },
          { status: 400 },
        );
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
              const errorResponse: JsonRpcResponse = {
                jsonrpc: '2.0',
                id: message.id ?? null,
                error: { code: INTERNAL_ERROR, message: err instanceof Error ? err.message : 'Internal error' },
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
