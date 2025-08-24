import { z } from 'zod';
import { ReactNode } from 'react';

export interface AUIContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: RequestInit) => Promise<any>;
  user?: any;
  session?: any;
}

export type ExecuteFunction<TInput, TOutput> = (args: {
  input: TInput;
  ctx: AUIContext;
}) => Promise<TOutput>;

export type ClientExecuteFunction<TInput, TOutput> = (args: {
  input: TInput;
  ctx: AUIContext;
}) => Promise<TOutput>;

export type RenderFunction<TOutput> = (args: {
  data: TOutput;
  loading?: boolean;
  error?: Error;
}) => ReactNode;

export interface AUITool<TInput = any, TOutput = any> {
  name: string;
  description?: string;
  inputSchema?: z.ZodSchema<TInput>;
  execute: ExecuteFunction<TInput, TOutput>;
  clientExecute?: ClientExecuteFunction<TInput, TOutput>;
  render?: RenderFunction<TOutput>;
}

export interface AUIToolBuilder<TInput = any, TOutput = any> {
  tool: (name: string) => AUIToolBuilder<TInput, TOutput>;
  description: (desc: string) => AUIToolBuilder<TInput, TOutput>;
  input: <T>(schema: z.ZodSchema<T>) => AUIToolBuilder<T, TOutput>;
  execute: <O>(fn: ExecuteFunction<TInput, O>) => AUIToolBuilder<TInput, O>;
  clientExecute: (fn: ClientExecuteFunction<TInput, TOutput>) => AUIToolBuilder<TInput, TOutput>;
  render: (fn: RenderFunction<TOutput>) => AUIToolBuilder<TInput, TOutput>;
  build: () => AUITool<TInput, TOutput>;
}