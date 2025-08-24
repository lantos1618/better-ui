import { z } from 'zod';
import { ReactElement } from 'react';
import type { ToolContext, ToolDefinition } from './types';
import { globalRegistry } from './core/registry';

type Handler<I, O> = (input: I) => O | Promise<O>;
type CtxHandler<I, O> = (input: I, ctx: ToolContext) => O | Promise<O>;
type Renderer<O> = (data: O) => ReactElement | string;

class UltraBuilder<I = any, O = any> {
  private def: Partial<ToolDefinition<I, O>> = {};
  
  constructor(name: string) {
    this.def.name = name;
  }
  
  // Ultra-concise chaining
  dollar(schema: z.ZodType<I>) {
    this.def.inputSchema = schema;
    return this;
  }
  
  underscore(handler: Handler<I, O> | { input: I; ctx?: ToolContext }) {
    this.def.execute = async (p: any) => handler(p.input);
    return this;
  }
  
  tilde(render: Renderer<O>) {
    this.def.render = (p: any) => render(p.data);
    return this;
  }
  
  plus(client: CtxHandler<I, O>) {
    this.def.clientExecute = async (p: any) => client(p.input, p.ctx);
    return this;
  }
  
  build(): ToolDefinition<I, O> {
    this.def.inputSchema = this.def.inputSchema || z.any();
    this.def.execute = this.def.execute || (async () => null as any);
    this.def.render = this.def.render || ((p: any) => p.data);
    return this.def as ToolDefinition<I, O>;
  }
}

// Ultra-concise factory functions
export const $tool = <I, O>(
  name: string,
  input: z.ZodType<I>,
  exec: Handler<I, O>,
  render?: Renderer<O>
): ToolDefinition<I, O> => {
  const tool = new UltraBuilder<I, O>(name)
    .dollar(input)
    .underscore(exec);
  if (render) tool.tilde(render);
  return tool.build();
};

// One-liner tool creation
export const $$ = <I, O>(
  name: string,
  [input, exec, render]: [z.ZodType<I>, Handler<I, O>, Renderer<O>?]
): ToolDefinition<I, O> => $tool(name, input, exec, render);

// Function-only tool (no schema validation)
export const $fn = <I = any, O = any>(
  name: string,
  fn: Handler<I, O>
): ToolDefinition<I, O> => 
  new UltraBuilder<I, O>(name).underscore(fn).build();

// Context-aware tool
export const $ctx = <I, O>(
  name: string,
  input: z.ZodType<I>,
  exec: CtxHandler<I, O>,
  render?: Renderer<O>
): ToolDefinition<I, O> => {
  const tool = new UltraBuilder<I, O>(name)
    .dollar(input)
    .underscore(exec as any)
    .plus(exec);
  if (render) tool.tilde(render);
  return tool.build();
};

// Batch tool creation
export const $batch = (tools: Record<string, [
  z.ZodType<any>,
  Handler<any, any>,
  Renderer<any>?
]>): Record<string, ToolDefinition> => {
  const result: Record<string, ToolDefinition> = {};
  for (const [name, config] of Object.entries(tools)) {
    result[name] = $$(name, config);
    globalRegistry.register(result[name]);
  }
  return result;
};

// Export builder for custom chaining
export const $ = (name: string) => new UltraBuilder(name);