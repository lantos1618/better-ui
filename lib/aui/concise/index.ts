import { ReactElement } from 'react';
import { z } from 'zod';

export interface ToolContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: any) => Promise<any>;
  storage?: Storage;
  user?: any;
}

export interface AUITool<TInput = any, TOutput = any> {
  name: string;
  inputSchema?: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput> | TOutput;
  clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput;
  render?: (props: { data: TOutput; input: TInput }) => ReactElement;
  
  // Chainable methods
  input<TNewInput>(schema: z.ZodType<TNewInput>): AUITool<TNewInput, TOutput>;
  execute<TNewOutput>(handler: (params: { input: TInput }) => Promise<TNewOutput> | TNewOutput): AUITool<TInput, TNewOutput>;
  clientExecute(handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput): AUITool<TInput, TOutput>;
  render(component: (props: { data: TOutput }) => ReactElement): AUITool<TInput, TOutput>;
}

class AUIToolImpl<TInput = any, TOutput = any> implements AUITool<TInput, TOutput> {
  name: string;
  inputSchema?: z.ZodType<TInput>;
  execute!: (params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput> | TOutput;
  clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput;
  render?: (props: { data: TOutput; input: TInput }) => ReactElement;

  constructor(name: string) {
    this.name = name;
    
    // Return a Proxy that makes the builder chainable while also being usable as a tool
    return new Proxy(this, {
      get(target, prop) {
        // If accessing a method, return the bound method
        if (typeof target[prop as keyof AUIToolImpl] === 'function') {
          return target[prop as keyof AUIToolImpl].bind(target);
        }
        // Otherwise return the property value
        return target[prop as keyof AUIToolImpl];
      }
    }) as AUIToolImpl<TInput, TOutput>;
  }

  input<TNewInput>(schema: z.ZodType<TNewInput>): AUITool<TNewInput, TOutput> {
    const tool = Object.create(this) as AUIToolImpl<TNewInput, TOutput>;
    tool.inputSchema = schema;
    return tool as AUITool<TNewInput, TOutput>;
  }

  execute<TNewOutput>(
    handler: (params: { input: TInput }) => Promise<TNewOutput> | TNewOutput
  ): AUITool<TInput, TNewOutput> {
    const tool = Object.create(this) as AUIToolImpl<TInput, TNewOutput>;
    tool.execute = handler as any;
    return tool as AUITool<TInput, TNewOutput>;
  }

  clientExecute(
    handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput
  ): AUITool<TInput, TOutput> {
    const tool = Object.create(this);
    tool.clientExecute = handler;
    return tool;
  }

  render(component: (props: { data: TOutput }) => ReactElement): AUITool<TInput, TOutput> {
    const tool = Object.create(this);
    tool.render = (props: { data: TOutput; input: TInput }) => component({ data: props.data });
    return tool;
  }
}

class AUI {
  private tools = new Map<string, AUITool>();

  tool(name: string): AUITool {
    const tool = new AUIToolImpl(name);
    this.tools.set(name, tool);
    return tool;
  }

  get(name: string): AUITool | undefined {
    return this.tools.get(name);
  }

  list(): AUITool[] {
    return Array.from(this.tools.values());
  }
}

// Create the global instance
const aui = new AUI();

// Export everything
export { aui, z };
export default aui;