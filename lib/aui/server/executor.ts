import type { ToolCall, ToolContext, ToolResult } from '../types';
import { globalRegistry } from '../core/registry';

export interface ExecutorOptions {
  context?: Partial<ToolContext>;
  registry?: { get: (name: string) => any };
}

export class ToolExecutor {
  private context: ToolContext;
  private registry: { get: (name: string) => any };

  constructor(options: ExecutorOptions = {}) {
    this.context = {
      cache: new Map(),
      fetch: globalThis.fetch,
      ...options.context,
    };
    this.registry = options.registry || globalRegistry;
  }

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.registry.get(toolCall.toolName);
    
    if (!tool) {
      return {
        id: toolCall.id,
        toolName: toolCall.toolName,
        output: null,
        error: `Tool "${toolCall.toolName}" not found`,
      };
    }

    try {
      const validatedInput = tool.inputSchema.parse(toolCall.input);
      const output = await tool.execute({
        input: validatedInput,
        ctx: this.context,
      });

      return {
        id: toolCall.id,
        toolName: toolCall.toolName,
        output,
      };
    } catch (error) {
      return {
        id: toolCall.id,
        toolName: toolCall.toolName,
        output: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async executeBatch(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map(call => this.execute(call)));
  }
}

export const defaultExecutor = new ToolExecutor();