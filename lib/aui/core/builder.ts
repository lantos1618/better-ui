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
  private _quickMode = false;

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
    
    // Auto-build in quick mode
    if (this._quickMode && this.config.render) {
      return this.build() as any;
    }
    return this as any;
  }

  // Shorthand: combine execute and render for ultra-concise API
  run<TNewOutput>(
    handler: ((input: TInput) => Promise<TNewOutput> | TNewOutput),
    renderer?: ((data: TNewOutput) => ReactElement)
  ): ToolBuilder<TInput, TNewOutput> | ToolDefinition<TInput, TNewOutput> {
    this.execute(handler as any);
    if (renderer) {
      this.render(renderer as any);
      if (this._quickMode) {
        return this.build() as any;
      }
    }
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
  
  // Ultra-concise alias
  clientEx(
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
    
    // Auto-build in quick mode if execute is already set
    if (this._quickMode && this.config.execute) {
      return this.build() as any;
    }
    return this;
  }

  // Ultra-concise: set both input and execute in one go
  handle<TNewInput, TNewOutput>(
    inputSchema: z.ZodType<TNewInput>,
    handler: ((input: TNewInput) => Promise<TNewOutput> | TNewOutput)
  ): ToolBuilder<TNewInput, TNewOutput> {
    this.input(inputSchema as any);
    this.execute(handler as any);
    return this as any;
  }

  // Chain input, execute, and render in one call
  define<TNewInput, TNewOutput>(
    inputSchema: z.ZodType<TNewInput>,
    handler: ((input: TNewInput) => Promise<TNewOutput> | TNewOutput),
    renderer?: ((data: TNewOutput) => ReactElement)
  ): ToolDefinition<TNewInput, TNewOutput> {
    this.input(inputSchema as any);
    this.execute(handler as any);
    if (renderer) {
      this.render(renderer as any);
    }
    return this.build() as any;
  }

  // Shorthand aliases for common patterns
  in<TSchema extends AnyZodSchema>(
    schema: TSchema
  ): ToolBuilder<z.infer<TSchema>, TOutput> {
    return this.input(schema);
  }

  ex<TNewOutput>(
    handler: ((input: TInput) => Promise<TNewOutput> | TNewOutput)
  ): ToolBuilder<TInput, TNewOutput> {
    return this.execute(handler as any);
  }

  out(component: ((data: TOutput) => ReactElement)): ToolBuilder<TInput, TOutput> {
    return this.render(component as any);
  }

  // Enable quick mode for auto-building
  quick(): ToolBuilder<TInput, TOutput> {
    this._quickMode = true;
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

  // Alias for build
  create(): ToolDefinition<TInput, TOutput> {
    return this.build();
  }

  done(): ToolDefinition<TInput, TOutput> {
    return this.build();
  }
}

export function createToolBuilder(name: string): ToolBuilder {
  return new ToolBuilderImpl(name);
}

// Export shortcuts for ultra-concise API
export const tool = createToolBuilder;
export const t = createToolBuilder;