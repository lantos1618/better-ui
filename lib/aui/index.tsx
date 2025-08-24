'use client';

import { ReactElement, ReactNode } from 'react';
import { z } from 'zod';

// Core types
export interface ToolContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: RequestInit) => Promise<any>;
  storage?: Storage;
  user?: any;
}

export interface ToolExecuteParams<TInput> {
  input: TInput;
  ctx?: ToolContext;
}

// The magic: AUITool is both a builder AND a tool definition
export interface AUITool<TInput = any, TOutput = any> {
  // Properties (make it act as a tool definition)
  readonly name: string;
  readonly inputSchema?: z.ZodType<TInput>;
  readonly execute?: (params: ToolExecuteParams<TInput>) => Promise<TOutput> | TOutput;
  readonly clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput;
  readonly render?: (props: { data: TOutput; input?: TInput }) => ReactElement;
  
  // Chainable methods (make it act as a builder)
  input<TNewInput>(schema: z.ZodType<TNewInput>): AUITool<TNewInput, TOutput>;
  execute<TNewOutput>(handler: (params: ToolExecuteParams<TInput>) => Promise<TNewOutput> | TNewOutput): AUITool<TInput, TNewOutput>;
  clientExecute(handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput): AUITool<TInput, TOutput>;
  render(component: (props: { data: TOutput }) => ReactElement): AUITool<TInput, TOutput>;
}

// Internal implementation
class AUIToolImpl<TInput = any, TOutput = any> {
  private _name: string;
  private _inputSchema?: z.ZodType<TInput>;
  private _execute?: (params: ToolExecuteParams<TInput>) => Promise<TOutput> | TOutput;
  private _clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput;
  private _render?: (props: { data: TOutput; input?: TInput }) => ReactElement;

  constructor(
    name: string,
    inputSchema?: z.ZodType<TInput>,
    execute?: (params: ToolExecuteParams<TInput>) => Promise<TOutput> | TOutput,
    clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput,
    render?: (props: { data: TOutput; input?: TInput }) => ReactElement
  ) {
    this._name = name;
    this._inputSchema = inputSchema;
    this._execute = execute;
    this._clientExecute = clientExecute;
    this._render = render;
  }

  // Create a new instance with updated properties
  private clone<TNewInput = TInput, TNewOutput = TOutput>(updates: Partial<{
    inputSchema: z.ZodType<TNewInput>;
    execute: (params: ToolExecuteParams<TNewInput>) => Promise<TNewOutput> | TNewOutput;
    clientExecute: (params: { input: TNewInput; ctx: ToolContext }) => Promise<TNewOutput> | TNewOutput;
    render: (props: { data: TNewOutput; input?: TNewInput }) => ReactElement;
  }>): AUITool<TNewInput, TNewOutput> {
    return createTool(
      this._name,
      updates.inputSchema || this._inputSchema as any,
      updates.execute || this._execute as any,
      updates.clientExecute || this._clientExecute as any,
      updates.render || this._render as any
    );
  }

  // Builder methods
  input<TNewInput>(schema: z.ZodType<TNewInput>): AUITool<TNewInput, TOutput> {
    return this.clone<TNewInput, TOutput>({ inputSchema: schema });
  }

  execute<TNewOutput>(handler: (params: ToolExecuteParams<TInput>) => Promise<TNewOutput> | TNewOutput): AUITool<TInput, TNewOutput> {
    return this.clone<TInput, TNewOutput>({ execute: handler });
  }

  clientExecute(handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput): AUITool<TInput, TOutput> {
    return this.clone({ clientExecute: handler });
  }

  render(component: (props: { data: TOutput }) => ReactElement): AUITool<TInput, TOutput> {
    return this.clone({ 
      render: (props: { data: TOutput; input?: TInput }) => component({ data: props.data })
    });
  }

  // Getters for tool definition properties
  get name() { return this._name; }
  get inputSchema() { return this._inputSchema; }
  get execute() { return this._execute; }
  get clientExecute() { return this._clientExecute; }
  get render() { return this._render; }
}

// Factory function that returns a Proxy to make the object behave as both builder and definition
function createTool<TInput = any, TOutput = any>(
  name: string,
  inputSchema?: z.ZodType<TInput>,
  execute?: (params: ToolExecuteParams<TInput>) => Promise<TOutput> | TOutput,
  clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput,
  render?: (props: { data: TOutput; input?: TInput }) => ReactElement
): AUITool<TInput, TOutput> {
  const impl = new AUIToolImpl(name, inputSchema, execute, clientExecute, render);
  
  return new Proxy(impl, {
    get(target, prop) {
      // If it's a method, bind it to the target
      const value = target[prop as keyof AUIToolImpl<TInput, TOutput>];
      if (typeof value === 'function') {
        return value.bind(target);
      }
      // If it's a property getter, call it
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), prop);
      if (descriptor && descriptor.get) {
        return descriptor.get.call(target);
      }
      return value;
    }
  }) as AUITool<TInput, TOutput>;
}

// Main AUI class
class AUI {
  private tools = new Map<string, AUITool>();

  // Create a new tool
  tool(name: string): AUITool {
    const tool = createTool(name);
    this.tools.set(name, tool);
    return tool;
  }

  // Get a registered tool
  get(name: string): AUITool | undefined {
    return this.tools.get(name);
  }

  // List all tools
  list(): AUITool[] {
    return Array.from(this.tools.values());
  }

  // Register an existing tool
  register(tool: AUITool): this {
    this.tools.set(tool.name, tool);
    return this;
  }
}

// Create the global instance
const aui = new AUI();

// Export everything
export { aui, z, type AUITool, type ToolContext };
export default aui;