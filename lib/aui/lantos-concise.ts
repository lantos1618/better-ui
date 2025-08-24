import { ReactElement } from 'react';
import { z } from 'zod';

type AUIContext = {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
};

type ToolConfig<I, O> = {
  name: string;
  input?: z.ZodType<I>;
  execute: (params: { input: I; ctx?: AUIContext }) => Promise<O> | O;
  clientExecute?: (params: { input: I; ctx: AUIContext }) => Promise<O> | O;
  render?: (props: { data: O; input?: I }) => ReactElement;
};

class Tool<I = any, O = any> {
  private config: ToolConfig<I, O>;

  constructor(name: string) {
    this.config = { name, execute: async () => null as any };
  }

  input<T>(schema: z.ZodType<T>): Tool<T, O> {
    this.config.input = schema as any;
    return this as any;
  }

  execute<R>(fn: (params: { input: I; ctx?: AUIContext }) => Promise<R> | R): Tool<I, R> {
    this.config.execute = fn as any;
    return this as any;
  }

  clientExecute(fn: (params: { input: I; ctx: AUIContext }) => Promise<O> | O): this {
    this.config.clientExecute = fn;
    return this;
  }

  render(component: (props: { data: O; input?: I }) => ReactElement): this {
    this.config.render = component;
    return this;
  }

  async run(input: I, ctx?: AUIContext): Promise<O> {
    const validated = this.config.input ? this.config.input.parse(input) : input;
    const isClient = typeof window !== 'undefined';
    const executor = isClient && this.config.clientExecute ? this.config.clientExecute : this.config.execute;
    return await executor({ input: validated, ctx: ctx || { cache: new Map(), fetch } });
  }

  get definition() {
    return this.config;
  }
}

const aui = {
  tool: (name: string) => new Tool(name),
  
  register: new Map<string, Tool>(),
  
  get: (name: string) => aui.register.get(name),
  
  set: (tool: Tool) => {
    aui.register.set(tool.definition.name, tool);
    return tool;
  }
};

export default aui;
export { Tool, type AUIContext };