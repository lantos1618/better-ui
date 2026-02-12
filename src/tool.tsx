/**
 * Better UI v2 - Tool Definition
 *
 * Clean, type-safe tool definition inspired by TanStack AI,
 * with Better UI's unique view integration.
 */

import { z } from 'zod';
import React, { ReactElement, memo } from 'react';

/** Behavioral hints for tools */
export interface ToolHints {
  /** Tool performs destructive/irreversible actions (auto-implies requiresConfirmation) */
  destructive?: boolean;
  /** Tool only reads data, never modifies state */
  readOnly?: boolean;
  /** Tool can be safely retried without side effects */
  idempotent?: boolean;
}

/** Entry stored in the tool context cache */
interface CacheEntry {
  data: unknown;
  expiry: number;
}

/**
 * Context passed to tool handlers
 *
 * SECURITY NOTE:
 * - Server-only fields (env, headers, cookies, user, session) are automatically
 *   stripped when running on the client to prevent accidental leakage.
 * - Server handlers NEVER run on the client - they auto-fetch via API instead.
 * - Never store secrets in tool output - it gets sent to the client.
 */
export interface ToolContext {
  /** Shared cache for deduplication */
  cache: Map<string, CacheEntry>;
  /** Fetch function (can be customized for auth headers, etc.) */
  fetch: typeof fetch;
  /** Whether running on server */
  isServer: boolean;

  // === Server-only fields (stripped on client) ===
  /** Environment variables - NEVER available on client */
  env?: Record<string, string>;
  /** Request headers - NEVER available on client */
  headers?: Headers;
  /** Cookies - NEVER available on client */
  cookies?: Record<string, string>;
  /** Authenticated user - NEVER available on client */
  user?: Record<string, unknown>;
  /** Session data - NEVER available on client */
  session?: Record<string, unknown>;

  // === Client-only fields ===
  /** Optimistic update function */
  optimistic?: <T>(data: Partial<T>) => void;
}

export interface CacheConfig<TInput> {
  ttl: number;
  key?: (input: TInput) => string;
}

/** Configuration for auto-fetch behavior when no client handler is defined */
export interface ClientFetchConfig {
  /** API endpoint for tool execution (default: '/api/tools/execute') */
  endpoint?: string;
}

export interface ToolConfig<TInput, TOutput> {
  name: string;
  description?: string;
  input: z.ZodType<TInput>;
  output?: z.ZodType<TOutput>;
  tags?: string[];
  cache?: CacheConfig<TInput>;
  /** Configure auto-fetch behavior for client-side execution */
  clientFetch?: ClientFetchConfig;
  /** If true or returns true, tool requires human confirmation before executing (HITL).
   *  When a function, it receives the input and can conditionally require confirmation. */
  confirm?: boolean | ((input: TInput) => boolean);
  /** Behavioral hints for the tool */
  hints?: ToolHints;
  /** Group related tool calls by a key derived from input.
   *  Calls with the same groupKey are collapsed in the thread — only the latest renders fully. */
  groupKey?: (input: TInput) => string;
  /** When true, a user UI action on this tool automatically sends the updated state
   *  to the AI so it can continue without the user typing a message. */
  autoRespond?: boolean;
}

export type ServerHandler<TInput, TOutput> = (
  input: TInput,
  ctx: ToolContext
) => Promise<TOutput> | TOutput;

export type ClientHandler<TInput, TOutput> = (
  input: TInput,
  ctx: ToolContext
) => Promise<TOutput> | TOutput;

export type StreamCallback<TOutput> = (partial: Partial<TOutput>) => void;

export type StreamHandler<TInput, TOutput> = (
  input: TInput,
  ctx: ToolContext & {
    /** Send a partial update to the view */
    stream: StreamCallback<TOutput>;
  }
) => Promise<TOutput>;

export type ViewState<TInput = unknown> = {
  loading?: boolean;
  /** True while receiving partial streaming updates */
  streaming?: boolean;
  error?: Error | null;
  onAction?: (input: TInput) => void | Promise<void>;
};

export type ViewComponent<TOutput, TInput = unknown> = (
  data: TOutput,
  state?: ViewState<TInput>
) => ReactElement | null;

// Default generic parameters use `any` intentionally — this is an API boundary.
// Using `unknown` would break `Record<string, Tool>` patterns since Tool<unknown>
// won't accept arbitrary inputs.
export class Tool<TInput = any, TOutput = any> {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: z.ZodType<TInput>;
  readonly outputSchema?: z.ZodType<TOutput>;
  readonly tags: string[];
  readonly cacheConfig?: CacheConfig<TInput>;
  readonly clientFetchConfig?: ClientFetchConfig;
  readonly confirm: boolean | ((input: TInput) => boolean);
  readonly hints: ToolHints;
  readonly groupKey?: (input: TInput) => string;
  readonly autoRespond: boolean;

  private _server?: ServerHandler<TInput, TOutput>;
  private _client?: ClientHandler<TInput, TOutput>;
  private _view?: ViewComponent<TOutput, TInput>;
  private _stream?: StreamHandler<TInput, TOutput>;

  constructor(config: ToolConfig<TInput, TOutput>) {
    this.name = config.name;
    this.description = config.description;
    this.inputSchema = config.input;
    this.outputSchema = config.output;
    this.tags = config.tags || [];
    this.cacheConfig = config.cache;
    this.clientFetchConfig = config.clientFetch;
    this.confirm = config.confirm ?? false;
    this.hints = config.hints ?? {};
    this.groupKey = config.groupKey;
    this.autoRespond = config.autoRespond ?? false;
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
  view(component: ViewComponent<TOutput, TInput>): this {
    this._view = component;
    // Reinitialize memoized View component with the new view function
    this._initView();
    return this;
  }

  /**
   * Define streaming implementation
   * The handler receives a `stream` callback to push partial updates.
   */
  stream(handler: StreamHandler<TInput, TOutput>): this {
    this._stream = handler;
    return this;
  }

  /**
   * Execute the tool
   * Automatically uses server or client handler based on environment
   *
   * SECURITY: Server handlers only run on server. Client automatically
   * fetches from /api/tools/execute if no client handler is defined.
   */
  async run(input: TInput, ctx?: Partial<ToolContext>): Promise<TOutput> {
    // Validate input
    const validated = this.inputSchema.parse(input);

    const isServer = ctx?.isServer ?? (typeof window === 'undefined');

    // Create context with defaults - SECURITY: strip server-only fields on client
    const context: ToolContext = {
      cache: ctx?.cache || new Map(),
      fetch: ctx?.fetch || globalThis.fetch?.bind(globalThis),
      isServer,
      // Only include server-sensitive fields when actually on server
      ...(isServer ? {
        env: ctx?.env,
        headers: ctx?.headers,
        cookies: ctx?.cookies,
        user: ctx?.user,
        session: ctx?.session,
      } : {
        // Client-only fields
        optimistic: ctx?.optimistic,
      }),
    };

    // Check cache if configured
    if (this.cacheConfig && context.cache) {
      const cacheKey = this.cacheConfig.key
        ? this.cacheConfig.key(validated)
        : `${this.name}:${JSON.stringify(validated)}`;

      const cached = context.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.data as TOutput;
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
      // Client execution - SECURITY: never run server handler on client
      if (this._client) {
        result = await this._client(validated, context);
      } else if (this._server) {
        // Auto-fetch from API endpoint instead of running server code on client
        // This ensures server secrets/logic stay on server
        result = await this._defaultClientFetch(validated, context);
      } else {
        throw new Error(`Tool "${this.name}" has no implementation`);
      }
    }

    // Validate output if schema provided
    if (this.outputSchema) {
      try {
        result = this.outputSchema.parse(result);
      } catch (error) {
        // Log validation error with context for debugging
        console.error(`Output validation failed for tool "${this.name}":`, error);
        if (error instanceof Error && 'errors' in error) {
          console.error('Validation errors:', (error as { errors?: unknown[] }).errors);
        }
        // Re-throw to be handled by caller
        throw error;
      }
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
   * Execute with streaming - returns async generator of partial results.
   * Falls back to run() if no stream handler is defined.
   */
  async *runStream(input: TInput, ctx?: Partial<ToolContext>): AsyncGenerator<{
    partial: Partial<TOutput>;
    done: boolean;
  }> {
    const validated = this.inputSchema.parse(input);

    if (!this._stream) {
      // Fallback: run normally and yield once
      const result = await this.run(input, ctx);
      yield { partial: result as Partial<TOutput>, done: true };
      return;
    }

    const isServer = ctx?.isServer ?? (typeof window === 'undefined');

    const context: ToolContext = {
      cache: ctx?.cache || new Map(),
      fetch: ctx?.fetch || globalThis.fetch?.bind(globalThis),
      isServer,
      ...(isServer ? {
        env: ctx?.env,
        headers: ctx?.headers,
        cookies: ctx?.cookies,
        user: ctx?.user,
        session: ctx?.session,
      } : {
        optimistic: ctx?.optimistic,
      }),
    };

    // Queue-based push-to-pull conversion
    type QueueItem = { partial: Partial<TOutput> } | { done: true; result: TOutput };
    const queue: QueueItem[] = [];
    let waiter: ((value: void) => void) | null = null;

    const notify = () => { waiter?.(); waiter = null; };
    const wait = () => new Promise<void>(r => { waiter = r; });

    const streamFn: StreamCallback<TOutput> = (partial) => {
      queue.push({ partial });
      notify();
    };

    let error: Error | null = null;
    let isDone = false;

    // Run handler in background
    this._stream(validated, { ...context, stream: streamFn })
      .then(result => {
        queue.push({ done: true, result });
        isDone = true;
        notify();
      })
      .catch(err => {
        error = err instanceof Error ? err : new Error(String(err));
        isDone = true;
        notify();
      });

    while (true) {
      while (queue.length > 0) {
        const item = queue.shift()!;
        if ('done' in item) {
          let finalResult = item.result;
          if (this.outputSchema) finalResult = this.outputSchema.parse(finalResult);
          yield { partial: finalResult as Partial<TOutput>, done: true };
          return;
        }
        yield { partial: item.partial, done: false };
      }
      if (error) throw error;
      if (isDone && queue.length === 0) return;
      await wait();
    }
  }

  /**
   * Default client fetch when no .client() is defined
   *
   * SECURITY: This ensures server handlers never run on the client.
   * The server-side /api/tools/execute endpoint handles execution safely.
   */
  private async _defaultClientFetch(
    input: TInput,
    ctx: ToolContext
  ): Promise<TOutput> {
    const endpoint = this.clientFetchConfig?.endpoint || '/api/tools/execute';

    const response = await ctx.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: this.name, input }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || `Tool execution failed: ${response.statusText}`);
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
    streaming?: boolean;
    error?: Error | null;
    onAction?: (input: TInput) => void | Promise<void>;
  }>;

  private _initView() {
    const viewFn = this._view;
    const name = this.name;
    const ViewComponent: React.FC<{
      data: TOutput | null;
      loading?: boolean;
      streaming?: boolean;
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
        streaming: props.streaming,
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

      // Compare streaming state
      if (prevProps.streaming !== nextProps.streaming) return false;

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
   * Check if tool has a streaming implementation
   */
  get hasStream(): boolean {
    return !!this._stream;
  }

  /**
   * Check if tool requires human confirmation before executing (HITL)
   * Returns true if `confirm` is truthy (boolean true or a function) OR `hints.destructive: true`
   */
  get requiresConfirmation(): boolean {
    return !!this.confirm || this.hints.destructive === true;
  }

  /**
   * Determine if a specific input should trigger user confirmation.
   * - If `confirm` is a function, calls it with input
   * - If `confirm` is boolean, returns it
   * - If `hints.destructive`, returns true
   */
  shouldConfirm(input: TInput): boolean {
    if (typeof this.confirm === 'function') {
      if (input == null) return false;
      return this.confirm(input);
    }
    if (typeof this.confirm === 'boolean') {
      return this.confirm;
    }
    return this.hints.destructive === true;
  }

  /**
   * Get the entity group key for a given input.
   * Returns `"toolName:groupKey(input)"` if groupKey is defined, otherwise undefined.
   */
  getGroupKey(input: TInput): string | undefined {
    if (!this.groupKey || input == null) return undefined;
    return `${this.name}:${this.groupKey(input)}`;
  }

  /**
   * Convert to plain object (for serialization)
   *
   * SECURITY: This intentionally excludes handlers and schemas to prevent
   * accidental exposure of server logic or validation details.
   */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      tags: this.tags,
      hasServer: this.hasServer,
      hasClient: this.hasClient,
      hasView: this.hasView,
      hasStream: this.hasStream,
      hasCache: !!this.cacheConfig,
      confirm: !!this.confirm,
      hints: this.hints,
      requiresConfirmation: this.requiresConfirmation,
      // Intentionally NOT included: handlers, schemas, clientFetchConfig
    };
  }

  /**
   * Convert to AI SDK format (Vercel AI SDK v5 compatible)
   *
   * If `confirm` is true, the execute function is omitted so the AI SDK
   * leaves the tool call at `state: 'input-available'`, enabling HITL
   * confirmation on the client before execution.
   */
  toAITool() {
    if (this.requiresConfirmation) {
      return {
        description: this.description || this.name,
        inputSchema: this.inputSchema,
      };
    }
    return {
      description: this.description || this.name,
      inputSchema: this.inputSchema,
      execute: async (input: TInput) => {
        return this.run(input, { isServer: true });
      },
    };
  }
}

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
// Default generic parameters use `any` intentionally — this is an API boundary.
// Using `unknown` would break `Record<string, Tool>` patterns since Tool<unknown>
// won't accept arbitrary inputs.
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

// Default generic parameters use `any` intentionally — this is an API boundary.
// Using `unknown` would break `Record<string, Tool>` patterns since Tool<unknown>
// won't accept arbitrary inputs.
export function tool<TInput, TOutput = any>(
  nameOrConfig: string | ToolConfig<TInput, TOutput>
): Tool<TInput, TOutput> | ToolBuilder {
  if (typeof nameOrConfig === 'string') {
    return new ToolBuilder(nameOrConfig);
  }
  return new Tool(nameOrConfig);
}

// Default generic parameters use `any` intentionally — this is an API boundary.
// Using `unknown` would break `Record<string, Tool>` patterns since Tool<unknown>
// won't accept arbitrary inputs.
class ToolBuilder<TInput = any, TOutput = any> {
  private _name: string;
  private _description?: string;
  private _input?: z.ZodType<TInput>;
  private _output?: z.ZodType<TOutput>;
  private _tags: string[] = [];
  private _cache?: CacheConfig<TInput>;
  private _clientFetch?: ClientFetchConfig;
  private _confirm?: boolean | ((input: TInput) => boolean);
  private _hints?: ToolHints;
  private _groupKey?: (input: TInput) => string;
  private _autoRespond?: boolean;
  private _serverHandler?: ServerHandler<TInput, TOutput>;
  private _clientHandler?: ClientHandler<TInput, TOutput>;
  private _viewComponent?: ViewComponent<TOutput, TInput>;
  private _streamHandler?: StreamHandler<TInput, TOutput>;

  constructor(name: string) {
    this._name = name;
  }

  description(desc: string): this {
    this._description = desc;
    return this;
  }

  /**
   * Define input schema - enables type inference for handlers
   *
   * NOTE: Uses type assertion internally. This is safe because:
   * 1. The schema is stored and used correctly at runtime
   * 2. The return type correctly reflects the new generic parameter
   * 3. TypeScript doesn't support "this type mutation" in fluent builders
   */
  input<T>(schema: z.ZodType<T>): ToolBuilder<T, TOutput> {
    this._input = schema as z.ZodType<any>;
    return this as unknown as ToolBuilder<T, TOutput>;
  }

  /**
   * Define output schema - enables type inference for results
   */
  output<O>(schema: z.ZodType<O>): ToolBuilder<TInput, O> {
    this._output = schema as z.ZodType<any>;
    return this as unknown as ToolBuilder<TInput, O>;
  }

  tags(...tags: string[]): this {
    this._tags.push(...tags);
    return this;
  }

  cache(config: CacheConfig<TInput>): this {
    this._cache = config;
    return this;
  }

  /** Configure auto-fetch endpoint for client-side execution */
  clientFetch(config: ClientFetchConfig): this {
    this._clientFetch = config;
    return this;
  }

  /** Require human confirmation before executing (HITL) */
  requireConfirm(value: boolean | ((input: TInput) => boolean) = true): this {
    this._confirm = value;
    return this;
  }

  /** Set a groupKey function for collapsing related tool calls */
  groupBy(fn: (input: TInput) => string): this {
    this._groupKey = fn;
    return this;
  }

  /** Auto-send updated state to AI after user interacts with this tool's UI */
  autoRespondAfterAction(value = true): this {
    this._autoRespond = value;
    return this;
  }

  /** Set behavioral hints for the tool */
  hints(hints: ToolHints): this {
    this._hints = hints;
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

  stream(handler: StreamHandler<TInput, TOutput>): this {
    this._streamHandler = handler;
    return this;
  }

  view(component: ViewComponent<TOutput, TInput>): this {
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
      clientFetch: this._clientFetch,
      confirm: this._confirm,
      hints: this._hints,
      groupKey: this._groupKey,
      autoRespond: this._autoRespond,
    });

    if (this._serverHandler) t.server(this._serverHandler);
    if (this._clientHandler) t.client(this._clientHandler);
    if (this._streamHandler) t.stream(this._streamHandler);
    if (this._viewComponent) t.view(this._viewComponent);

    return t;
  }

  /**
   * Auto-build when accessing Tool methods
   */
  async run(input: TInput, ctx?: Partial<ToolContext>): Promise<TOutput> {
    return this.build().run(input, ctx);
  }

  async *runStream(input: TInput, ctx?: Partial<ToolContext>): AsyncGenerator<{
    partial: Partial<TOutput>;
    done: boolean;
  }> {
    yield* this.build().runStream(input, ctx);
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
