// Server-side version of AUI without React dependencies
import { z } from 'zod';

export interface ToolContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: any) => Promise<any>;
  storage?: any;
  user?: any;
}

export interface ToolExecuteParams<TInput> {
  input: TInput;
  ctx?: ToolContext;
}

export interface AUITool<TInput = any, TOutput = any> {
  readonly name: string;
  readonly inputSchema?: z.ZodType<TInput>;
  readonly execute?: (params: ToolExecuteParams<TInput>) => Promise<TOutput> | TOutput;
  readonly clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput;
  readonly render?: any; // Server-side doesn't need React types
}

class AUI {
  private tools = new Map<string, AUITool>();

  tool(name: string): AUITool {
    // For server-side, just return a placeholder
    return { name } as AUITool;
  }

  get(name: string): AUITool | undefined {
    return this.tools.get(name);
  }

  list(): AUITool[] {
    return Array.from(this.tools.values());
  }

  register(tool: AUITool): this {
    this.tools.set(tool.name, tool);
    return this;
  }
}

const aui = new AUI();

export { aui, z };
export default aui;