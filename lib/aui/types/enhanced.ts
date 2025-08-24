import { z } from 'zod';
import { ReactElement } from 'react';

// Enhanced type definitions for ultra-concise AUI

// Tool execution context with all capabilities
export interface AUIContext {
  // Caching
  cache: {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    clear(): void;
  };
  
  // Network
  fetch<T>(url: string, options?: any): Promise<T>;
  stream<T>(url: string, options?: any): AsyncIterableIterator<T>;
  
  // UI Control
  router: {
    push(path: string): void;
    replace(path: string): void;
    back(): void;
  };
  
  modal: {
    open(id: string, props?: any): void;
    close(id: string): void;
  };
  
  toast: {
    success(message: string): void;
    error(message: string): void;
    info(message: string): void;
  };
  
  // State Management
  state: {
    get<T>(key: string): T;
    set<T>(key: string, value: T): void;
    subscribe(key: string, callback: (value: any) => void): () => void;
  };
  
  // Auth
  auth: {
    getUser(): Promise<any>;
    getToken(): string | null;
    isAuthenticated(): boolean;
  };
  
  // Real-time updates
  update<T>(data: T): void;
  
  // AI-specific
  ai: {
    generateId(): string;
    log(event: string, data?: any): void;
    metrics: {
      start(id: string): void;
      end(id: string): void;
    };
  };
}

// Tool builder with enhanced type inference
export interface AUIToolBuilder<TInput = any, TOutput = any> {
  // Input definition
  input<T extends z.ZodType>(schema: T): AUIToolBuilder<z.infer<T>, TOutput>;
  
  // Execution handlers
  execute(
    handler: (params: { input: TInput; ctx?: AUIContext }) => Promise<TOutput> | TOutput
  ): AUIToolBuilder<TInput, TOutput>;
  
  clientExecute(
    handler: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput
  ): AUIToolBuilder<TInput, TOutput>;
  
  // Rendering
  render(
    component: (props: { data: TOutput; input: TInput; ctx?: AUIContext }) => ReactElement
  ): AUIToolBuilder<TInput, TOutput>;
  
  // Modifiers
  serverOnly(): AUIToolBuilder<TInput, TOutput>;
  clientOnly(): AUIToolBuilder<TInput, TOutput>;
  streaming(): AUIToolBuilder<TInput, TOutput>;
  
  // Metadata
  description(text: string): AUIToolBuilder<TInput, TOutput>;
  tags(...tags: string[]): AUIToolBuilder<TInput, TOutput>;
  version(v: string): AUIToolBuilder<TInput, TOutput>;
  
  // AI optimization
  retry(count: number): AUIToolBuilder<TInput, TOutput>;
  timeout(ms: number): AUIToolBuilder<TInput, TOutput>;
  cache(ttl?: number): AUIToolBuilder<TInput, TOutput>;
  
  // Build
  build(): AUITool<TInput, TOutput>;
}

// Built tool with all capabilities
export interface AUITool<TInput = any, TOutput = any> {
  name: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  
  // Execution
  execute(params: { input: TInput; ctx?: AUIContext }): Promise<TOutput>;
  clientExecute?(params: { input: TInput; ctx: AUIContext }): Promise<TOutput>;
  
  // Rendering
  render(props: { data: TOutput; input: TInput; ctx?: AUIContext }): ReactElement;
  
  // Metadata
  description?: string;
  tags?: string[];
  version?: string;
  
  // Flags
  isServerOnly?: boolean;
  isClientOnly?: boolean;
  isStreaming?: boolean;
  
  // AI optimization
  aiConfig?: {
    retry?: number;
    timeout?: number;
    cache?: number;
  };
}

// Tool registry for managing multiple tools
export interface AUIRegistry {
  register<T extends AUITool>(tool: T): void;
  get<T extends AUITool>(name: string): T | undefined;
  list(): AUITool[];
  has(name: string): boolean;
  remove(name: string): void;
  clear(): void;
  
  // Batch operations
  registerMany(tools: AUITool[]): void;
  getMany(names: string[]): AUITool[];
  
  // Search and filter
  findByTag(tag: string): AUITool[];
  findByDescription(query: string): AUITool[];
  
  // Export/Import
  export(): string;
  import(data: string): void;
}

// AI Control capabilities
export interface AIControl {
  // Frontend control
  ui: {
    setTheme(theme: 'light' | 'dark' | 'auto'): void;
    navigate(path: string): void;
    openModal(id: string, props?: any): void;
    closeModal(id: string): void;
    showToast(message: string, type?: 'success' | 'error' | 'info'): void;
    updateState(key: string, value: any): void;
    addClass(selector: string, className: string): void;
    removeClass(selector: string, className: string): void;
    toggleClass(selector: string, className: string): void;
    scrollTo(selector: string, options?: ScrollIntoViewOptions): void;
    focus(selector: string): void;
    click(selector: string): void;
    type(selector: string, text: string): void;
  };
  
  // Backend control
  db: {
    query<T>(sql: string, params?: any[]): Promise<T[]>;
    insert(table: string, data: any): Promise<any>;
    update(table: string, data: any, where: any): Promise<any>;
    delete(table: string, where: any): Promise<any>;
    transaction<T>(fn: () => Promise<T>): Promise<T>;
  };
  
  // File system control
  fs: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    delete(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    list(path: string): Promise<string[]>;
  };
  
  // Process control
  process: {
    exec(command: string): Promise<string>;
    spawn(command: string, args: string[]): Promise<void>;
    kill(pid: number): Promise<void>;
  };
  
  // API control
  api: {
    call<T>(endpoint: string, options?: any): Promise<T>;
    stream(endpoint: string, options?: any): AsyncIterableIterator<any>;
    websocket(url: string): WebSocket;
  };
}

// Type helpers for better DX
export type InferInput<T> = T extends AUITool<infer I, any> ? I : never;
export type InferOutput<T> = T extends AUITool<any, infer O> ? O : never;
export type InferContext<T> = T extends { ctx: infer C } ? C : AUIContext;

// Utility types for tool composition
export type ToolChain<T extends AUITool[]> = {
  tools: T;
  execute(input: InferInput<T[0]>): Promise<InferOutput<T[T['length'] extends 1 ? 0 : number]>>;
  pipe<U extends AUITool>(tool: U): ToolChain<[...T, U]>;
};

// Tool modifier utilities
export type WithCache<T extends AUITool> = T & { cache: { ttl: number } };
export type WithRetry<T extends AUITool> = T & { retry: { count: number; delay: number } };
export type WithTimeout<T extends AUITool> = T & { timeout: number };

// Export all enhanced types
export type {
  AUIContext as Context,
  AUIToolBuilder as ToolBuilder,
  AUITool as Tool,
  AUIRegistry as Registry,
  AIControl as Control,
};