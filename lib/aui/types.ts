import { z } from 'zod';
import { ReactElement } from 'react';

export interface AUIContext {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
  env?: Record<string, string>;
  headers?: HeadersInit;
  cookies?: Record<string, string>;
  isServer?: boolean;
}

export type ExecuteFunction<TInput, TOutput> = (params: {
  input: TInput;
  ctx?: AUIContext;
}) => Promise<TOutput> | TOutput;

export type ClientExecuteFunction<TInput, TOutput> = (params: {
  input: TInput;
  ctx: AUIContext;
}) => Promise<TOutput> | TOutput;

export type RenderFunction<TInput, TOutput> = (props: {
  data: TOutput;
  input?: TInput;
  loading?: boolean;
  error?: Error;
}) => ReactElement;

export type MiddlewareFunction<TInput, TOutput> = (params: {
  input: TInput;
  ctx: AUIContext;
  next: () => Promise<TOutput>;
}) => Promise<TOutput>;

export interface ToolConfig<TInput, TOutput> {
  name: string;
  inputSchema?: z.ZodType<TInput>;
  executeHandler?: ExecuteFunction<TInput, TOutput>;
  clientHandler?: ClientExecuteFunction<TInput, TOutput>;
  renderHandler?: RenderFunction<TInput, TOutput>;
  middleware?: Array<MiddlewareFunction<TInput, TOutput>>;
  description?: string;
  tags?: string[];
}