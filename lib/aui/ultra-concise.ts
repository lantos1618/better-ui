import { ReactElement } from 'react';
import { z } from 'zod';
import { globalRegistry } from './core/registry';

// Types for the ultra-concise API
export interface AUITool<TInput = any, TOutput = any> {
  name: string;
  inputSchema?: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: any }) => Promise<TOutput>;
  clientExecute?: (params: { input: TInput; ctx: any }) => Promise<TOutput>;
  render?: (props: { data: TOutput; input: TInput }) => ReactElement;
  isServerOnly?: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

// Proxy-based builder that auto-builds on property access
class AUIToolBuilder<TInput = any, TOutput = any> {
  private tool: Partial<AUITool<TInput, TOutput>> = {};
  private built = false;
  
  constructor(name: string) {
    this.tool.name = name;
    
    // Return a Proxy that intercepts property access
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        // If accessing a builder method, return it
        if (prop in target && typeof (target as any)[prop] === 'function') {
          return (target as any)[prop].bind(target);
        }
        
        // If accessing a tool property and we have execute and render, auto-build
        if (this.tool.execute && this.tool.render && !this.built) {
          this.built = true;
          const finalTool = this.finalize();
          return (finalTool as any)[prop];
        }
        
        // Otherwise return the property from the tool
        return (this.tool as any)[prop];
      }
    }) as any;
  }
  
  input<TSchema extends z.ZodType>(schema: TSchema): AUIToolBuilder<z.infer<TSchema>, TOutput> {
    this.tool.inputSchema = schema;
    return this as any;
  }
  
  execute<TNewOutput>(
    handler: ((params: { input: TInput }) => Promise<TNewOutput> | TNewOutput) |
             ((input: TInput) => Promise<TNewOutput> | TNewOutput)
  ): AUIToolBuilder<TInput, TNewOutput> {
    this.tool.execute = async (params: { input: TInput }) => {
      // Support both parameter styles
      const result = handler.length === 1 && !handler.toString().includes('{')
        ? await (handler as any)(params.input)
        : await (handler as any)(params);
      return result;
    };
    
    // If we have render, auto-finalize
    if (this.tool.render && !this.built) {
      this.built = true;
      return this.finalize() as any;
    }
    
    return this as any;
  }
  
  clientExecute(
    handler: ((params: { input: TInput; ctx: any }) => Promise<TOutput> | TOutput) |
             ((input: TInput, ctx: any) => Promise<TOutput> | TOutput)
  ): AUIToolBuilder<TInput, TOutput> | AUITool<TInput, TOutput> {
    this.tool.clientExecute = async (params: { input: TInput; ctx: any }) => {
      const result = handler.length === 2
        ? await (handler as any)(params.input, params.ctx)
        : await (handler as any)(params);
      return result;
    };
    
    // If we have execute and render, auto-finalize
    if (this.tool.execute && this.tool.render && !this.built) {
      this.built = true;
      return this.finalize() as any;
    }
    
    return this as any;
  }
  
  render(
    component: ((props: { data: TOutput }) => ReactElement) |
               ((props: { data: TOutput; input: TInput }) => ReactElement)
  ): AUITool<TInput, TOutput> {
    this.tool.render = component as any;
    
    // If we have execute, auto-finalize
    if (this.tool.execute && !this.built) {
      this.built = true;
      return this.finalize();
    }
    
    return this as any;
  }
  
  private finalize(): AUITool<TInput, TOutput> {
    if (!this.tool.inputSchema) {
      this.tool.inputSchema = z.any() as any;
    }
    if (!this.tool.execute) {
      throw new Error(`Tool "${this.tool.name}" must have an execute handler`);
    }
    if (!this.tool.render) {
      this.tool.render = ({ data }) => data as any;
    }
    
    const finalTool = this.tool as AUITool<TInput, TOutput>;
    
    // Auto-register with global registry
    globalRegistry.register(finalTool as any);
    
    return finalTool;
  }
}

// The ultra-concise AUI API
class UltraAUI {
  tool(name: string) {
    return new AUIToolBuilder(name);
  }
  
  // Even shorter alias
  t(name: string) {
    return new AUIToolBuilder(name);
  }
}

export const aui = new UltraAUI();
export default aui;