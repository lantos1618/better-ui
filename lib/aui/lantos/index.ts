import { ReactElement } from 'react';
import { z } from 'zod';

// Core types
export interface ToolContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: any) => Promise<any>;
  user?: any;
  session?: any;
}

// Fluent builder interface
export interface Tool<TInput = any, TOutput = any> {
  // Properties
  name: string;
  inputSchema: z.ZodType<TInput>;
  execute: ((params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput>) & 
           (<O>(handler: (params: { input: TInput }) => Promise<O> | O) => Tool<TInput, O>);
  clientExecute?: ((params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>) & 
                  ((handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput) => Tool<TInput, TOutput>);
  render: ((props: { data: TOutput; input?: TInput }) => ReactElement) & 
          ((component: (props: { data: TOutput }) => ReactElement) => Tool<TInput, TOutput>);
  metadata?: Record<string, any>;
  
  // Additional chainable methods
  input<T>(schema: z.ZodType<T>): Tool<T, TOutput>;
}

class ToolImpl<TInput = any, TOutput = any> implements Tool<TInput, TOutput> {
  name: string;
  inputSchema: z.ZodType<TInput> = z.any() as any;
  metadata?: Record<string, any> = {};
  
  private registry?: Map<string, Tool>;
  private _execute: (params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput> = async () => null as any;
  private _clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>;
  private _render: (props: { data: TOutput; input?: TInput }) => ReactElement = ({ data }) => data as any;

  constructor(name: string, registry?: Map<string, Tool>) {
    this.name = name;
    this.registry = registry;
    // Auto-register when created
    if (registry) {
      registry.set(name, this);
    }
    
    // Setup hybrid execute function
    const executeHybrid = Object.assign(
      (params: { input: TInput; ctx?: ToolContext }) => this._execute(params),
      {
        bind: (handler: (params: { input: TInput }) => Promise<TOutput> | TOutput) => {
          this._execute = (async (params: { input: TInput }) => {
            return await Promise.resolve(handler(params));
          }) as any;
          return this;
        }
      }
    );
    
    // Override execute property
    Object.defineProperty(this, 'execute', {
      get: () => {
        const fn = (arg: any) => {
          // If called with a function, it's a builder call
          if (typeof arg === 'function') {
            this._execute = (async (params: { input: TInput }) => {
              return await Promise.resolve(arg(params));
            }) as any;
            return this;
          }
          // Otherwise it's an execution call
          // Validate input first and return a promise
          return (async () => {
            const validatedInput = this.inputSchema.parse(arg.input);
            return this._execute({ ...arg, input: validatedInput });
          })();
        };
        return fn;
      },
      enumerable: true
    });
    
    // Override render property
    Object.defineProperty(this, 'render', {
      get: () => {
        const fn = (arg: any) => {
          // If called with a function, it's a builder call
          if (typeof arg === 'function') {
            this._render = arg;
            return this;
          }
          // Otherwise it's a render call
          return this._render(arg);
        };
        return fn;
      },
      enumerable: true
    });
    
    // Override clientExecute property
    Object.defineProperty(this, 'clientExecute', {
      get: () => {
        if (!this._clientExecute) {
          return (handler: any) => {
            if (typeof handler === 'function') {
              this._clientExecute = async (params: any) => {
                return await Promise.resolve(handler(params));
              };
              return this;
            }
            return undefined;
          };
        }
        const fn = (arg: any) => {
          // If called with a function, it's a builder call
          if (typeof arg === 'function') {
            this._clientExecute = async (params: any) => {
              return await Promise.resolve(arg(params));
            };
            return this;
          }
          // Otherwise it's an execution call
          return this._clientExecute!(arg);
        };
        return fn;
      },
      enumerable: true
    });
  }

  // Chainable methods
  input<T>(schema: z.ZodType<T>): Tool<T, TOutput> {
    this.inputSchema = schema as any;
    return this as any;
  }
}

// Main AUI class
class AUI {
  private tools = new Map<string, Tool>();

  // Create a tool - returns a chainable builder
  tool(name: string): Tool {
    const tool = new ToolImpl(name, this.tools);
    return tool as any;
  }

  // Get a registered tool
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // List all tools
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  // Clear all tools
  clear() {
    this.tools.clear();
  }
}

// Create the global instance
const aui = new AUI();

export { aui };
export default aui;