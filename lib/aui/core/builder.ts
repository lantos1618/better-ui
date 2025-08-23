import { ReactElement } from 'react';
import { z } from 'zod';
import type {
  AnyZodSchema,
  ToolBuilder,
  ToolContext,
  ToolDefinition,
  ToolExecuteParams,
} from '../types';

class ToolBuilderImpl<TInput = any, TOutput = any> implements ToolBuilder<TInput, TOutput> {
  private config: Partial<ToolDefinition<TInput, TOutput>> = {};

  constructor(name: string) {
    this.config.name = name;
    this.config.isServerOnly = false;
  }

  input<TSchema extends AnyZodSchema>(
    schema: TSchema
  ): ToolBuilder<z.infer<TSchema>, TOutput> {
    this.config.inputSchema = schema;
    return this as any;
  }

  execute<TNewOutput>(
    handler: ((params: { input: TInput }) => Promise<TNewOutput> | TNewOutput) | 
             ((params: { input: TInput; ctx?: ToolContext }) => Promise<TNewOutput> | TNewOutput) |
             ((input: TInput) => Promise<TNewOutput> | TNewOutput)
  ): ToolBuilder<TInput, TNewOutput> {
    this.config.execute = async (params: ToolExecuteParams<TInput>) => {
      // Smart parameter detection for cleaner API
      const handlerStr = handler.toString();
      const usesCtx = handlerStr.includes('ctx');
      const isDestructured = handlerStr.includes('{') && handlerStr.indexOf('{') < handlerStr.indexOf('=>');
      
      let result;
      if (!isDestructured && handler.length === 1) {
        // Simple form: async (input) => { ... }
        result = (handler as any)(params.input);
      } else if (usesCtx) {
        // With context: async ({ input, ctx }) => { ... }
        result = (handler as any)(params);
      } else {
        // Destructured form: async ({ input }) => { ... }
        result = (handler as any)({ input: params.input });
      }
      return Promise.resolve(result);
    };
    return this as any;
  }

  clientExecute(
    handler: ((params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput) |
             ((input: TInput, ctx: ToolContext) => Promise<TOutput> | TOutput)
  ): ToolBuilder<TInput, TOutput> {
    this.config.clientExecute = async (params) => {
      const result = handler.length === 2
        ? (handler as any)(params.input, params.ctx)
        : (handler as any)(params);
      return Promise.resolve(result);
    };
    this.config.isServerOnly = false;
    return this;
  }

  client(
    handler: ((params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput) |
             ((input: TInput, ctx: ToolContext) => Promise<TOutput> | TOutput)
  ): ToolBuilder<TInput, TOutput> {
    return this.clientExecute(handler);
  }

  serverOnly(): ToolBuilder<TInput, TOutput> {
    this.config.isServerOnly = true;
    return this;
  }

  render(
    component: ((props: { data: TOutput; input: TInput }) => ReactElement) |
               ((data: TOutput) => ReactElement)
  ): ToolBuilder<TInput, TOutput> {
    this.config.render = component.length === 1
      ? (props: any) => (component as any)(props.data)
      : component as any;
    return this;
  }

  description(desc: string): ToolBuilder<TInput, TOutput> {
    this.config.description = desc;
    return this;
  }

  metadata(meta: Record<string, any>): ToolBuilder<TInput, TOutput> {
    this.config.metadata = { ...this.config.metadata, ...meta };
    return this;
  }

  output<TSchema extends AnyZodSchema>(
    schema: TSchema
  ): ToolBuilder<TInput, z.infer<TSchema>> {
    this.config.outputSchema = schema;
    return this as any;
  }

  build(): ToolDefinition<TInput, TOutput> {
    if (!this.config.inputSchema) {
      this.config.inputSchema = z.object({}) as any;
    }
    if (!this.config.execute) {
      throw new Error(`Tool "${this.config.name}" must have an execute handler`);
    }
    if (!this.config.render) {
      this.config.render = ({ data }) => data as any;
    }

    return this.config as ToolDefinition<TInput, TOutput>;
  }

  done(): ToolDefinition<TInput, TOutput> {
    return this.build();
  }
}

export function createToolBuilder(name: string): ToolBuilder {
  return new ToolBuilderImpl(name);
}