import { ReactElement } from 'react';
import { z } from 'zod';

export type AnyZodSchema = z.ZodType<any, any, any>;

export interface ToolContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: RequestInit) => Promise<any>;
  userId?: string;
  sessionId?: string;
}

export interface ToolExecuteParams<TInput> {
  input: TInput;
  ctx: ToolContext;
}

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string;
  description?: string;
  inputSchema: AnyZodSchema;
  outputSchema?: AnyZodSchema;
  execute: (params: ToolExecuteParams<TInput>) => Promise<TOutput>;
  clientExecute?: (params: ToolExecuteParams<TInput>) => Promise<TOutput>;
  render?: (props: { data: TOutput; input: TInput }) => ReactElement;
  isServerOnly?: boolean;
  metadata?: Record<string, any>;
}

export interface ToolBuilder<TInput = any, TOutput = any> {
  input<TSchema extends AnyZodSchema>(
    schema: TSchema
  ): ToolBuilder<z.infer<TSchema>, TOutput>;
  
  execute<TNewOutput>(
    handler: ((params: { input: TInput }) => Promise<TNewOutput> | TNewOutput) |
             ((params: { input: TInput; ctx?: ToolContext }) => Promise<TNewOutput> | TNewOutput) |
             ((input: TInput) => Promise<TNewOutput> | TNewOutput)
  ): ToolBuilder<TInput, TNewOutput>;
  
  clientExecute(
    handler: ((params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput) |
             ((input: TInput, ctx: ToolContext) => Promise<TOutput> | TOutput)
  ): ToolBuilder<TInput, TOutput>;
  
  client(
    handler: ((params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput) |
             ((input: TInput, ctx: ToolContext) => Promise<TOutput> | TOutput)
  ): ToolBuilder<TInput, TOutput>;
  
  clientEx(
    handler: ((params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput) |
             ((input: TInput, ctx: ToolContext) => Promise<TOutput> | TOutput)
  ): ToolBuilder<TInput, TOutput>;
  
  render(
    component: ((props: { data: TOutput; input: TInput }) => ReactElement) |
               ((data: TOutput) => ReactElement)
  ): ToolBuilder<TInput, TOutput>;
  
  description(desc: string): ToolBuilder<TInput, TOutput>;
  
  metadata(meta: Record<string, any>): ToolBuilder<TInput, TOutput>;
  
  output<TSchema extends AnyZodSchema>(
    schema: TSchema
  ): ToolBuilder<TInput, z.infer<TSchema>>;
  
  serverOnly(): ToolBuilder<TInput, TOutput>;
  
  // New concise methods
  run<TNewOutput>(
    handler: ((input: TInput) => Promise<TNewOutput> | TNewOutput),
    renderer?: ((data: TNewOutput) => ReactElement)
  ): ToolBuilder<TInput, TNewOutput> | ToolDefinition<TInput, TNewOutput>;
  
  handle<TNewInput, TNewOutput>(
    inputSchema: z.ZodType<TNewInput>,
    handler: ((input: TNewInput) => Promise<TNewOutput> | TNewOutput)
  ): ToolBuilder<TNewInput, TNewOutput>;
  
  define<TNewInput, TNewOutput>(
    inputSchema: z.ZodType<TNewInput>,
    handler: ((input: TNewInput) => Promise<TNewOutput> | TNewOutput),
    renderer?: ((data: TNewOutput) => ReactElement)
  ): ToolDefinition<TNewInput, TNewOutput>;
  
  // Shorthand aliases
  in<TSchema extends AnyZodSchema>(
    schema: TSchema
  ): ToolBuilder<z.infer<TSchema>, TOutput>;
  
  ex<TNewOutput>(
    handler: ((input: TInput) => Promise<TNewOutput> | TNewOutput)
  ): ToolBuilder<TInput, TNewOutput>;
  
  out(component: ((data: TOutput) => ReactElement)): ToolBuilder<TInput, TOutput>;
  
  quick(): ToolBuilder<TInput, TOutput>;
  
  build(): ToolDefinition<TInput, TOutput>;
  
  create(): ToolDefinition<TInput, TOutput>;
  
  done(): ToolDefinition<TInput, TOutput>;
  
  // Ultra-concise all-in-one methods
  do<TNewInput = TInput, TNewOutput = TOutput>(
    handler: ((input: TNewInput) => Promise<TNewOutput> | TNewOutput) |
             { 
               input?: z.ZodType<TNewInput>;
               execute: (input: TNewInput) => Promise<TNewOutput> | TNewOutput;
               render?: (data: TNewOutput) => ReactElement;
               client?: (input: TNewInput, ctx: ToolContext) => Promise<TNewOutput> | TNewOutput;
             }
  ): ToolDefinition<TNewInput, TNewOutput>;
  
  // AI-optimized configuration
  ai<TNewInput = TInput, TNewOutput = TOutput>(
    config: {
      input?: z.ZodType<TNewInput>;
      execute: (input: TNewInput) => Promise<TNewOutput> | TNewOutput;
      client?: (input: TNewInput, ctx: ToolContext) => Promise<TNewOutput> | TNewOutput;
      render?: (data: TNewOutput) => ReactElement;
      retry?: number;
      timeout?: number;
      cache?: boolean;
    }
  ): ToolDefinition<TNewInput, TNewOutput>;
  
  // Single-character aliases
  i<TSchema extends AnyZodSchema>(schema: TSchema): ToolBuilder<z.infer<TSchema>, TOutput>;
  e<TNewOutput>(handler: ((input: TInput) => Promise<TNewOutput> | TNewOutput)): ToolBuilder<TInput, TNewOutput>;
  r(component: ((data: TOutput) => ReactElement)): ToolBuilder<TInput, TOutput>;
  c(handler: ((input: TInput, ctx: ToolContext) => Promise<TOutput> | TOutput)): ToolBuilder<TInput, TOutput>;
  b(): ToolDefinition<TInput, TOutput>;
}

export interface ToolRegistry {
  tools: Map<string, ToolDefinition>;
  register(tool: ToolDefinition): void;
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
}

export interface ToolCall {
  id: string;
  toolName: string;
  input: any;
}

export interface ToolResult {
  id: string;
  toolName: string;
  output: any;
  error?: string;
}