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
  execute: (params: ToolExecuteParams<TInput>) => Promise<TOutput>;
  clientExecute?: (params: ToolExecuteParams<TInput>) => Promise<TOutput>;
  render?: (props: { data: TOutput; input: TInput }) => ReactElement;
  isServerOnly?: boolean;
}

export interface ToolBuilder<TInput = any, TOutput = any> {
  input<TSchema extends AnyZodSchema>(
    schema: TSchema
  ): ToolBuilder<z.infer<TSchema>, TOutput>;
  
  execute<TNewOutput>(
    handler: ((params: { input: TInput }) => Promise<TNewOutput>) |
             ((params: { input: TInput; ctx: ToolContext }) => Promise<TNewOutput>)
  ): ToolBuilder<TInput, TNewOutput>;
  
  clientExecute(
    handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>
  ): ToolBuilder<TInput, TOutput>;
  
  render(
    component: (props: { data: TOutput; input: TInput }) => ReactElement
  ): ToolBuilder<TInput, TOutput>;
  
  description(desc: string): ToolBuilder<TInput, TOutput>;
  
  serverOnly(): ToolBuilder<TInput, TOutput>;
  
  build(): ToolDefinition<TInput, TOutput>;
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