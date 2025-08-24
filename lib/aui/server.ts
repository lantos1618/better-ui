// Server-side AUI for API routes
import { z } from 'zod';
import { Tool, ToolContext } from './index';

class ServerAUI {
  private tools = new Map<string, Tool>();

  tool(name: string): Tool {
    const t = new Tool(name);
    this.tools.set(name, t);
    return t;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  register(tool: Tool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  async execute<TInput = any, TOutput = any>(
    name: string,
    input: TInput,
    ctx?: ToolContext
  ): Promise<TOutput> {
    const tool = this.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return await tool.run(input, ctx || this.createContext());
  }

  createContext(additions?: Partial<ToolContext>): ToolContext {
    return {
      cache: new Map(),
      fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
      ...additions,
    };
  }

  getTools(): Tool[] { return Array.from(this.tools.values()); }
  getToolNames(): string[] { return Array.from(this.tools.keys()); }
  has(name: string): boolean { return this.tools.has(name); }
  clear(): void { this.tools.clear(); }
  remove(name: string): boolean { return this.tools.delete(name); }
}

const aui = new ServerAUI();

// Register server-side tools
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    await new Promise(r => setTimeout(r, 200));
    return {
      results: [
        { id: 1, title: `Server result for "${input.query}" #1`, score: 0.95 },
        { id: 2, title: `Server result for "${input.query}" #2`, score: 0.87 },
        { id: 3, title: `Server result for "${input.query}" #3`, score: 0.76 }
      ]
    };
  });

export { z } from 'zod';
export { aui, Tool, type ToolContext };
export default aui;