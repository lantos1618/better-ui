/**
 * AG-UI (Agent-User Interaction Protocol) Server for Better UI
 *
 * Implements the AG-UI protocol, allowing Better UI tools to be used with
 * CopilotKit, LangChain, and any AG-UI compatible frontend.
 *
 * Protocol: Server-Sent Events (SSE) over HTTP
 *
 * @see https://docs.ag-ui.com
 *
 * @example
 * ```typescript
 * import { createAGUIServer } from '@lantos1618/better-ui/agui';
 *
 * const server = createAGUIServer({
 *   name: 'my-tools',
 *   tools: { weather: weatherTool, search: searchTool },
 * });
 *
 * // Next.js route handler
 * export const POST = server.handler();
 * ```
 */

import type { Tool, ToolContext } from '../tool';
import { zodToJsonSchema } from '../mcp/schema';

// ─── AG-UI Event Types ──────────────────────────────────────────────────────

export type AGUIEventType =
  | 'RUN_STARTED'
  | 'RUN_FINISHED'
  | 'RUN_ERROR'
  | 'STEP_STARTED'
  | 'STEP_FINISHED'
  | 'TEXT_MESSAGE_START'
  | 'TEXT_MESSAGE_CONTENT'
  | 'TEXT_MESSAGE_END'
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_ARGS'
  | 'TOOL_CALL_END'
  | 'TOOL_CALL_RESULT'
  | 'STATE_SNAPSHOT'
  | 'STATE_DELTA'
  | 'CUSTOM'
  | 'RAW';

export interface AGUIEvent {
  type: AGUIEventType;
  timestamp?: number;
  [key: string]: unknown;
}

export interface RunAgentInput {
  threadId: string;
  runId: string;
  /** Tool definitions from the client */
  tools?: Array<{
    name: string;
    description?: string;
  }>;
  /** Messages context */
  messages?: Array<{
    role: string;
    content: string;
  }>;
  /** Single tool call to execute */
  toolCall?: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  };
  /** Multiple tool calls to execute in sequence */
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  /** State context from the frontend */
  state?: Record<string, unknown>;
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface AGUIServerConfig {
  /** Server name */
  name: string;
  /** Tool registry — keys are tool names */
  tools: Record<string, Tool>;
  /** Optional context passed to every tool execution */
  context?: Partial<ToolContext>;
  /** Called on errors */
  onError?: (error: Error) => void;
  /**
   * Allowlist of permitted `Origin` header values.
   * Requests without an `Origin` header (non-browser clients) are always allowed.
   * When set, a browser request is allowed only if its Origin is in this list.
   * When omitted, a browser request is allowed only if its Origin matches the request Host (same-origin).
   * Guards against DNS-rebinding / CSRF attacks.
   */
  allowedOrigins?: string[];
  /**
   * Authentication/authorization hook run before each tool call executes.
   * Throw to reject the call — the tool will not run and a RUN_ERROR event is emitted.
   */
  onBeforeExecute?: (toolName: string, args: unknown, req: Request) => void | Promise<void>;
  /** Maximum accepted request body size in bytes (default: 1 MiB). Oversized requests get HTTP 413. */
  maxBodyBytes?: number;
  /** When true, echo raw error details to clients. When false (default), return generic messages and log details server-side. */
  debug?: boolean;
}

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024; // 1 MiB

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

/** Error marked as safe to surface to clients (e.g. auth / unknown-tool / validation). */
class SafeError extends Error {
  readonly safe = true;
  constructor(message: string) {
    super(message);
    this.name = 'SafeError';
  }
}

// ─── AG-UI Server ───────────────────────────────────────────────────────────

export class AGUIServer {
  private config: AGUIServerConfig;

  constructor(config: AGUIServerConfig) {
    this.config = config;
  }

  /** Get available tools in AG-UI format */
  listTools(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
    return Object.values(this.config.tools).map((tool) => ({
      name: tool.name,
      description: tool.description || tool.name,
      parameters: zodToJsonSchema(tool.inputSchema),
    }));
  }

  /**
   * Create an HTTP handler that implements the AG-UI protocol.
   * Returns an SSE stream of AG-UI events.
   *
   * @example
   * ```typescript
   * // Next.js: app/api/agui/route.ts
   * export const POST = server.handler();
   *
   * // Express:
   * app.post('/api/agui', (req, res) => server.handler()(req));
   * ```
   */
  handler(): (req: Request) => Promise<Response> {
    return async (req: Request): Promise<Response> => {
      // Validate Origin (DNS-rebinding / CSRF protection)
      if (!isOriginAllowed(req, this.config.allowedOrigins)) {
        return new Response('Origin not allowed', { status: 403 });
      }

      const body = await readCappedJson(req, this.config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES);
      if (body.tooLarge) {
        return new Response('Payload too large', { status: 413 });
      }
      if (body.parseError) {
        return new Response('Invalid JSON', { status: 400 });
      }
      const input = body.value as RunAgentInput;

      const { threadId, runId, toolCall } = input;

      if (!threadId || !runId) {
        return new Response('Missing threadId or runId', { status: 400 });
      }

      const encoder = new TextEncoder();
      const self = this;

      const stream = new ReadableStream({
        async start(controller) {
          const emit = (event: AGUIEvent) => {
            const data = JSON.stringify({ ...event, timestamp: event.timestamp ?? Date.now() });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          };

          try {
            // Run started
            emit({ type: 'RUN_STARTED', threadId, runId });

            // Collect tool calls (single or batch)
            const calls = toolCall ? [toolCall] : (input.toolCalls ?? []);

            if (calls.length > 0) {
              for (const call of calls) {
                // Authentication/authorization hook — reject before the tool runs.
                if (self.config.onBeforeExecute) {
                  try {
                    await self.config.onBeforeExecute(call.name, call.args, req);
                  } catch (authErr) {
                    throw new SafeError(authErr instanceof Error ? authErr.message : 'Unauthorized');
                  }
                }
                await self.executeToolCall(call, emit);
              }
            } else {
              // No tool calls — list available tools as a text message
              const tools = self.listTools();
              const messageId = `msg_${runId}`;
              emit({ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' });
              emit({
                type: 'TEXT_MESSAGE_CONTENT',
                messageId,
                delta: `Available tools: ${tools.map(t => t.name).join(', ')}`,
              });
              emit({ type: 'TEXT_MESSAGE_END', messageId });
            }

            // Run finished
            emit({ type: 'RUN_FINISHED', threadId, runId });
          } catch (err) {
            // Preserve safe messages (auth, unknown-tool, Zod validation); genericize the rest unless debug.
            const isSafe =
              err instanceof SafeError ||
              (err instanceof Error && (err.name === 'ZodError' || (err as { safe?: boolean }).safe === true));
            if (!isSafe && !self.config.debug) {
              console.error('[AG-UI] Tool execution error:', err);
            }
            const message = isSafe || self.config.debug
              ? (err instanceof Error ? err.message : 'Unknown error')
              : 'Tool execution failed';
            emit({
              type: 'RUN_ERROR',
              threadId,
              runId,
              message,
            });
            self.config.onError?.(err instanceof Error ? err : new Error(String(err)));
          }

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    };
  }

  /**
   * Execute a tool call and emit AG-UI events.
   */
  private async executeToolCall(
    toolCall: { id: string; name: string; args: Record<string, unknown> },
    emit: (event: AGUIEvent) => void,
  ): Promise<void> {
    const { id, name, args } = toolCall;

    // Validate tool exists (safe lookup)
    if (!Object.prototype.hasOwnProperty.call(this.config.tools, name)) {
      emit({
        type: 'TOOL_CALL_START',
        toolCallId: id,
        toolCallName: name,
      });
      emit({
        type: 'TOOL_CALL_END',
        toolCallId: id,
      });
      throw new SafeError(`Unknown tool: ${name}`);
    }

    const tool = this.config.tools[name];

    // TOOL_CALL_START
    emit({
      type: 'TOOL_CALL_START',
      toolCallId: id,
      toolCallName: name,
    });

    // TOOL_CALL_ARGS — emit the full args
    emit({
      type: 'TOOL_CALL_ARGS',
      toolCallId: id,
      delta: JSON.stringify(args),
    });

    // Execute the tool
    const result = await tool.run(args, {
      isServer: true,
      ...this.config.context,
    });

    // TOOL_CALL_RESULT — emit the result
    const resultText = typeof result === 'string' ? result : JSON.stringify(result);
    emit({
      type: 'TOOL_CALL_RESULT',
      toolCallId: id,
      result: resultText,
    });

    // TOOL_CALL_END
    emit({
      type: 'TOOL_CALL_END',
      toolCallId: id,
    });
  }

}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create an AG-UI server from a Better UI tool registry.
 *
 * @example
 * ```typescript
 * const server = createAGUIServer({
 *   name: 'my-app',
 *   tools: { weather: weatherTool, search: searchTool },
 * });
 *
 * // Use as Next.js route handler
 * export const POST = server.handler();
 * ```
 */
export function createAGUIServer(config: AGUIServerConfig): AGUIServer {
  return new AGUIServer(config);
}
