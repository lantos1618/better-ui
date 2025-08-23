import { z } from 'zod';
import { AUITool, AUIToolBuilder, ExecuteFunction, ClientExecuteFunction, RenderFunction } from './types';

class ToolBuilder<TInput = any, TOutput = any> implements AUIToolBuilder<TInput, TOutput> {
  private _name: string = '';
  private _description?: string;
  private _inputSchema?: z.ZodSchema<TInput>;
  private _execute?: ExecuteFunction<TInput, TOutput>;
  private _clientExecute?: ClientExecuteFunction<TInput, TOutput>;
  private _render?: RenderFunction<TOutput>;

  tool(name: string): AUIToolBuilder<TInput, TOutput> {
    this._name = name;
    return this;
  }

  description(desc: string): AUIToolBuilder<TInput, TOutput> {
    this._description = desc;
    return this;
  }

  input<T>(schema: z.ZodSchema<T>): AUIToolBuilder<T, TOutput> {
    const builder = this as any;
    builder._inputSchema = schema;
    return builder;
  }

  execute<O>(fn: ExecuteFunction<TInput, O>): AUIToolBuilder<TInput, O> {
    const builder = this as any;
    builder._execute = fn;
    return builder;
  }

  clientExecute(fn: ClientExecuteFunction<TInput, TOutput>): AUIToolBuilder<TInput, TOutput> {
    this._clientExecute = fn;
    return this;
  }

  render(fn: RenderFunction<TOutput>): AUIToolBuilder<TInput, TOutput> {
    this._render = fn;
    return this;
  }

  build(): AUITool<TInput, TOutput> {
    if (!this._name) throw new Error('Tool name is required');
    if (!this._execute) throw new Error('Execute function is required');

    return {
      name: this._name,
      description: this._description,
      inputSchema: this._inputSchema,
      execute: this._execute,
      clientExecute: this._clientExecute,
      render: this._render,
    };
  }
}

export const aui = {
  tool: (name: string) => new ToolBuilder().tool(name),
};