import { ReactElement } from 'react';
import { z } from 'zod';

// Core types for Lantos AUI
export interface LantosAUITool<TInput = any, TOutput = any> {
  name: string;
  inputSchema?: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: any }) => Promise<TOutput>;
  clientExecute?: (params: { input: TInput; ctx: any }) => Promise<TOutput>;
  render: (props: { data: TOutput; input?: TInput }) => ReactElement;
  isServerOnly?: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

// Context for client-side execution
export interface LantosContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: any) => Promise<any>;
  user?: any;
  session?: any;
}

// Fluent builder that auto-finalizes when all required methods are called
class LantosToolBuilder<TInput = any, TOutput = any> {
  private tool: Partial<LantosAUITool<TInput, TOutput>> = {};
  private finalized = false;
  
  constructor(name: string) {
    this.tool.name = name;
  }
  
  input<TSchema extends z.ZodType>(schema: TSchema): LantosToolBuilder<z.infer<TSchema>, TOutput> {
    this.tool.inputSchema = schema;
    return this as any;
  }
  
  execute<TNewOutput>(
    handler: (params: { input: TInput; ctx?: any }) => Promise<TNewOutput> | TNewOutput
  ): LantosToolBuilder<TInput, TNewOutput> & Partial<LantosAUITool<TInput, TNewOutput>> {
    this.tool.execute = async (params) => handler(params);
    
    // Check if we can auto-finalize
    if (this.tool.render && !this.finalized) {
      return this.finalize() as any;
    }
    
    // Return a proxy that allows render() to be called or properties to be accessed
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'render') {
          return target.render.bind(target);
        }
        if (prop === 'clientExecute') {
          return target.clientExecute.bind(target);
        }
        // Return tool properties if finalized
        if (this.finalized) {
          return (this.tool as any)[prop];
        }
        return (target as any)[prop];
      }
    }) as any;
  }
  
  clientExecute(
    handler: (params: { input: TInput; ctx: LantosContext }) => Promise<TOutput> | TOutput
  ): LantosToolBuilder<TInput, TOutput> & Partial<LantosAUITool<TInput, TOutput>> {
    this.tool.clientExecute = async (params) => handler(params);
    
    // Check if we can auto-finalize
    if (this.tool.execute && this.tool.render && !this.finalized) {
      return this.finalize() as any;
    }
    
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'render') {
          return target.render.bind(target);
        }
        // Return tool properties if finalized
        if (this.finalized) {
          return (this.tool as any)[prop];
        }
        return (target as any)[prop];
      }
    }) as any;
  }
  
  render(
    component: (props: { data: TOutput; input?: TInput }) => ReactElement
  ): LantosToolBuilder<TInput, TOutput> & LantosAUITool<TInput, TOutput> {
    this.tool.render = component;
    
    // Check if we have execute handler
    if (!this.tool.execute) {
      throw new Error(`Tool "${this.tool.name}" must have an execute handler before render`);
    }
    
    // Return a proxy that allows clientExecute to be called or acts as the final tool
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'clientExecute' && !this.finalized) {
          return (handler: any) => {
            this.tool.clientExecute = async (params: any) => handler(params);
            return this.finalize();
          };
        }
        
        // Auto-finalize if accessing tool properties
        if (!this.finalized && prop !== 'clientExecute') {
          const finalTool = this.finalize();
          return (finalTool as any)[prop];
        }
        
        return (this.tool as any)[prop];
      }
    }) as any;
  }
  
  private finalize(): LantosAUITool<TInput, TOutput> {
    if (!this.tool.execute) {
      throw new Error(`Tool "${this.tool.name}" must have an execute handler`);
    }
    if (!this.tool.render) {
      throw new Error(`Tool "${this.tool.name}" must have a render method`);
    }
    
    // Set default input schema if not provided
    if (!this.tool.inputSchema) {
      this.tool.inputSchema = z.any() as any;
    }
    
    this.finalized = true;
    const finalTool = this.tool as LantosAUITool<TInput, TOutput>;
    
    // Register with global registry if needed
    if (typeof window !== 'undefined' && (window as any).__LANTOS_REGISTRY) {
      (window as any).__LANTOS_REGISTRY.register(finalTool);
    }
    
    return finalTool;
  }
}

// Main Lantos AUI API
class LantosAUI {
  tool(name: string): LantosToolBuilder {
    return new LantosToolBuilder(name);
  }
  
  // Registry for tools
  private registry = new Map<string, LantosAUITool>();
  
  register(tool: LantosAUITool): void {
    this.registry.set(tool.name, tool);
  }
  
  get(name: string): LantosAUITool | undefined {
    return this.registry.get(name);
  }
  
  list(): LantosAUITool[] {
    return Array.from(this.registry.values());
  }
  
  // Execute a tool by name
  async execute(name: string, input: any, ctx?: any): Promise<any> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    
    // Validate input if schema is provided
    if (tool.inputSchema) {
      const result = tool.inputSchema.safeParse(input);
      if (!result.success) {
        throw new Error(`Invalid input for tool "${name}": ${result.error.message}`);
      }
    }
    
    // Use client execute if available and we're on the client
    if (typeof window !== 'undefined' && tool.clientExecute && ctx) {
      return tool.clientExecute({ input, ctx });
    }
    
    return tool.execute({ input, ctx });
  }
}

// Export the singleton instance
export const aui = new LantosAUI();

// Also make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__LANTOS_AUI = aui;
  (window as any).__LANTOS_REGISTRY = aui;
}

export default aui;
export type { LantosAUITool, LantosContext };