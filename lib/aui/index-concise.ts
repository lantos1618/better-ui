import { ReactElement } from 'react';
import { z } from 'zod';

export { z };

type ToolContext = {
  cache: Map<string, any>;
  fetch: (url: string, options?: any) => Promise<any>;
  [key: string]: any;
};

type ToolDefinition<TInput = any, TOutput = any> = {
  name: string;
  inputSchema: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>;
  clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>;
  render: (props: { data: TOutput }) => ReactElement;
  build: () => ToolDefinition<TInput, TOutput>;
};

class ToolBuilder<TInput = any, TOutput = any> {
  private _name: string;
  private _inputSchema?: z.ZodType<TInput>;
  private _execute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>;
  private _clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>;
  private _render?: (props: { data: TOutput }) => ReactElement;

  constructor(name: string) {
    this._name = name;
  }

  input<T>(schema: z.ZodType<T>): ToolBuilder<T, TOutput> {
    this._inputSchema = schema as any;
    return this as any;
  }

  execute<T>(
    handler: (params: { input: TInput; ctx?: ToolContext }) => Promise<T> | T
  ): ToolBuilder<TInput, T> {
    this._execute = (async (params) => {
      const result = await handler(params);
      return result;
    }) as any;
    return this as any;
  }

  clientExecute(
    handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput
  ): ToolBuilder<TInput, TOutput> {
    this._clientExecute = async (params) => {
      const result = await handler(params);
      return result;
    };
    return this;
  }

  render(
    component: (props: { data: TOutput }) => ReactElement
  ): ToolBuilder<TInput, TOutput> {
    this._render = component;
    return this;
  }

  build(): ToolDefinition<TInput, TOutput> {
    if (!this._inputSchema) {
      throw new Error(`Tool "${this._name}" must have an input schema`);
    }
    if (!this._execute) {
      throw new Error(`Tool "${this._name}" must have an execute handler`);
    }
    if (!this._render) {
      this._render = ({ data }) => data as any;
    }

    return {
      name: this._name,
      inputSchema: this._inputSchema,
      execute: this._execute,
      clientExecute: this._clientExecute,
      render: this._render,
      build: () => this.build()
    };
  }
}

class AUI {
  private tools = new Map<string, ToolDefinition>();

  tool(name: string): ToolBuilder {
    return new ToolBuilder(name);
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

const aui = new AUI();
export default aui;