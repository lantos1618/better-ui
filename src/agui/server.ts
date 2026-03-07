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
      let input: RunAgentInput;
      try {
        input = await req.json();
      } catch {
        return new Response('Invalid JSON', { status: 400 });
      }

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
            emit({
              type: 'RUN_ERROR',
              threadId,
              runId,
              message: err instanceof Error ? err.message : 'Unknown error',
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
      throw new Error(`Unknown tool: ${name}`);
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
