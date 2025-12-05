/**
 * Better UI v2 - Tool Definition
 *
 * Clean, type-safe tool definition inspired by TanStack AI,
 * with Better UI's unique view integration.
 */

import { z } from 'zod';
import React, { ReactElement, memo } from 'react';

// ============================================
// Types
// ============================================

export interface ToolContext {
  cache: Map<string, any>;
  fetch: typeof fetch;
  // Server-only
  env?: Record<string, string>;
  headers?: Headers;
  cookies?: Record<string, string>;
  user?: any;
  session?: any;
  isServer: boolean;
  // Client-only
  optimistic?: <T>(data: Partial<T>) => void;
}

export interface CacheConfig<TInput> {
  ttl: number;
  key?: (input: TInput) => string;
}

export interface ToolConfig<TInput, TOutput> {
  name: string;
  description?: string;
  input: z.ZodType<TInput>;
  output?: z.ZodType<TOutput>;
  tags?: string[];
  cache?: CacheConfig<TInput>;
}

export type ServerHandler<TInput, TOutput> = (
  input: TInput,
  ctx: ToolContext
) => Promise<TOutput> | TOutput;

export type ClientHandler<TInput, TOutput> = (
  input: TInput,
  ctx: ToolContext
) => Promise<TOutput> | TOutput;

export type ViewState<TInput = any> = {
  loading?: boolean;
  error?: Error | null;
  onAction?: (input: TInput) => void | Promise<void>;
};

export type ViewComponent<TOutput, TInput = any> = (
  data: TOutput,
  state?: ViewState<TInput>
) => ReactElement | null;

// ============================================
// Tool Class
// ============================================

export class Tool<TInput = any, TOutput = any> {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: z.ZodType<TInput>;
  readonly outputSchema?: z.ZodType<TOutput>;
  readonly tags: string[];
  readonly cacheConfig?: CacheConfig<TInput>;

  private _server?: ServerHandler<TInput, TOutput>;
  private _client?: ClientHandler<TInput, TOutput>;
  private _view?: ViewComponent<TOutput>;

  constructor(config: ToolConfig<TInput, TOutput>) {
    this.name = config.name;
    this.description = config.description;
    this.inputSchema = config.input;
    this.outputSchema = config.output;
    this.tags = config.tags || [];
    this.cacheConfig = config.cache;
    // Initialize View with default behavior
    this._initView();
  }

  /**
   * Define server-side implementation
   * Runs on server (API routes, server components, etc.)
   */
  server(handler: ServerHandler<TInput, TOutput>): this {
    this._server = handler;
    return this;
  }

  /**
   * Define client-side implementation
   * Runs in browser. If not specified, auto-fetches to /api/tools/{name}
   */
  client(handler: ClientHandler<TInput, TOutput>): this {
    this._client = handler;
    return this;
  }

  /**
   * Define view component for rendering results
   * Our differentiator from TanStack AI
   */
  view(component: ViewComponent<TOutput>): this {
    this._view = component;
    // Reinitialize memoized View component with the new view function
    this._initView();
    return this;
  }

  /**
   * Execute the tool
   * Automatically uses server or client handler based on environment
   */
  async run(input: TInput, ctx?: Partial<ToolContext>): Promise<TOutput> {
    // Validate input
    const validated = this.inputSchema.parse(input);

    // Create context with defaults
    const context: ToolContext = {
      cache: ctx?.cache || new Map(),
      fetch: ctx?.fetch || globalThis.fetch?.bind(globalThis),
      isServer: ctx?.isServer ?? (typeof window === 'undefined'),
      ...ctx,
    };

    // Check cache if configured
    if (this.cacheConfig && context.cache) {
      const cacheKey = this.cacheConfig.key
        ? this.cacheConfig.key(validated)
        : `${this.name}:${JSON.stringify(validated)}`;

      const cached = context.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
    }

    let result: TOutput;

    if (context.isServer) {
      // Server execution
      if (!this._server) {
        throw new Error(`Tool "${this.name}" has no server implementation`);
      }
      result = await this._server(validated, context);
    } else {
      // Client execution
      if (this._client) {
        result = await this._client(validated, context);
      } else if (this._server) {
        // Run server handler directly on client if no client handler defined
        // This works for tools with simulated/local data
        // For real server-only logic, define a .client() that fetches from API
        result = await this._server(validated, context);
      } else {
        throw new Error(`Tool "${this.name}" has no implementation`);
      }
    }

    // Validate output if schema provided
    if (this.outputSchema) {
      result = this.outputSchema.parse(result);
    }

    // Cache result if configured
    if (this.cacheConfig && context.cache) {
      const cacheKey = this.cacheConfig.key
        ? this.cacheConfig.key(validated)
        : `${this.name}:${JSON.stringify(validated)}`;

      context.cache.set(cacheKey, {
        data: result,
        expiry: Date.now() + this.cacheConfig.ttl,
      });
    }

    return result;
  }

  /**
   * Make the tool callable directly: await weather({ city: 'London' })
   */
  async call(input: TInput, ctx?: Partial<ToolContext>): Promise<TOutput> {
    return this.run(input, ctx);
  }

  /**
   * Default client fetch when no .client() is defined
   */
  private async _defaultClientFetch(
    input: TInput,
    ctx: ToolContext
  ): Promise<TOutput> {
    const response = await ctx.fetch('/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: this.name, input }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Tool execution failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result ?? data.data ?? data;
  }

  /**
   * Render the tool's view component
   * Memoized to prevent unnecessary re-renders when parent state changes
   */
  View!: React.NamedExoticComponent<{
    data: TOutput | null;
    loading?: boolean;
    error?: Error | null;
    onAction?: (input: TInput) => void | Promise<void>;
  }>;

  private _initView() {
    const viewFn = this._view;
    const name = this.name;
    const ViewComponent: React.FC<{
      data: TOutput | null;
      loading?: boolean;
      error?: Error | null;
      onAction?: (input: TInput) => void | Promise<void>;
    }> = (props) => {
      if (!viewFn) {
        // Default: JSON display
        if (props.loading) return null;
        if (props.error) return null;
        if (!props.data) return null;
        return <pre>{JSON.stringify(props.data, null, 2)}</pre>;
      }

      if (!props.data && !props.loading && !props.error) {
        return null;
      }

      return viewFn(props.data!, {
        loading: props.loading,
        error: props.error,
        onAction: props.onAction,
      });
    };
    ViewComponent.displayName = `${name}View`;

    // Custom comparison: only re-render if visual props change
    // onAction changes frequently but doesn't affect the visual output
    // (it's always bound to the same toolCallId for a given View instance)
    this.View = memo(ViewComponent, (prevProps, nextProps) => {
      // Return true if props are equal (should NOT re-render)
      // Return false if props are different (should re-render)

      // Compare data by reference (fast check for unchanged data)
      if (prevProps.data !== nextProps.data) return false;

      // Compare loading state
      if (prevProps.loading !== nextProps.loading) return false;

      // Compare error
      if (prevProps.error !== nextProps.error) return false;

      // Intentionally ignore onAction - it's bound to the same toolCallId
      // and will always perform the same operation for this View instance
      return true;
    });
  }

  /**
   * Check if tool has a view
   */
  get hasView(): boolean {
    return !!this._view;
  }

  /**
   * Check if tool has server implementation
   */
  get hasServer(): boolean {
    return !!this._server;
  }

  /**
   * Check if tool has custom client implementation
   */
  get hasClient(): boolean {
    return !!this._client;
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      tags: this.tags,
      hasServer: this.hasServer,
      hasClient: this.hasClient,
      hasView: this.hasView,
      hasCache: !!this.cacheConfig,
    };
  }

  /**
   * Convert to AI SDK format (Vercel AI SDK v5 compatible)
   */
  toAITool() {
    return {
      description: this.description || this.name,
      inputSchema: this.inputSchema,
      execute: async (input: TInput) => {
        return this.run(input, { isServer: true });
      },
    };
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new tool with object config
 *
 * @example
 * const weather = tool({
 *   name: 'weather',
 *   description: 'Get weather for a city',
 *   input: z.object({ city: z.string() }),
 *   output: z.object({ temp: z.number() }),
 * });
 *
 * weather.server(async ({ city }) => {
 *   return { temp: await getTemp(city) };
 * });
 */
export function tool<TInput, TOutput = any>(
  config: ToolConfig<TInput, TOutput>
): Tool<TInput, TOutput>;

/**
 * Create a new tool with fluent builder
 *
 * @example
 * const weather = tool('weather')
 *   .description('Get weather for a city')
 *   .input(z.object({ city: z.string() }))
 *   .output(z.object({ temp: z.number() }))
 *   .server(async ({ city }) => ({ temp: 72 }));
 */
export function tool(name: string): ToolBuilder;

export function tool<TInput, TOutput = any>(
  nameOrConfig: string | ToolConfig<TInput, TOutput>
): Tool<TInput, TOutput> | ToolBuilder {
  if (typeof nameOrConfig === 'string') {
    return new ToolBuilder(nameOrConfig);
  }
  return new Tool(nameOrConfig);
}

// ============================================
// Fluent Builder
// ============================================

class ToolBuilder<TInput = any, TOutput = any> {
  private _name: string;
  private _description?: string;
  private _input?: z.ZodType<TInput>;
  private _output?: z.ZodType<TOutput>;
  private _tags: string[] = [];
  private _cache?: CacheConfig<TInput>;
  private _serverHandler?: ServerHandler<TInput, TOutput>;
  private _clientHandler?: ClientHandler<TInput, TOutput>;
  private _viewComponent?: ViewComponent<TOutput>;

  constructor(name: string) {
    this._name = name;
  }

  description(desc: string): this {
    this._description = desc;
    return this;
  }

  input<T>(schema: z.ZodType<T>): ToolBuilder<T, TOutput> {
    this._input = schema as any;
    return this as any;
  }

  output<O>(schema: z.ZodType<O>): ToolBuilder<TInput, O> {
    this._output = schema as any;
    return this as any;
  }

  tags(...tags: string[]): this {
    this._tags.push(...tags);
    return this;
  }

  cache(config: CacheConfig<TInput>): this {
    this._cache = config;
    return this;
  }

  server(handler: ServerHandler<TInput, TOutput>): this {
    this._serverHandler = handler;
    return this;
  }

  client(handler: ClientHandler<TInput, TOutput>): this {
    this._clientHandler = handler;
    return this;
  }

  view(component: ViewComponent<TOutput>): this {
    this._viewComponent = component;
    return this;
  }

  /**
   * Build the final Tool instance
   */
  build(): Tool<TInput, TOutput> {
    if (!this._input) {
      throw new Error(`Tool "${this._name}" requires an input schema`);
    }

    const t = new Tool<TInput, TOutput>({
      name: this._name,
      description: this._description,
      input: this._input,
      output: this._output,
      tags: this._tags,
      cache: this._cache,
    });

    if (this._serverHandler) t.server(this._serverHandler);
    if (this._clientHandler) t.client(this._clientHandler);
    if (this._viewComponent) t.view(this._viewComponent);

    return t;
  }

  /**
   * Auto-build when accessing Tool methods
   */
  async run(input: TInput, ctx?: Partial<ToolContext>): Promise<TOutput> {
    return this.build().run(input, ctx);
  }

  get View() {
    return this.build().View;
  }

  toJSON() {
    return this.build().toJSON();
  }

  toAITool() {
    return this.build().toAITool();
  }
}

export { ToolBuilder };
