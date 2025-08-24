/**
 * Lantos AUI - Ultra-concise API for AI-controlled frontend/backend operations
 * 
 * Philosophy: Minimal boilerplate, maximum power
 */

import React, { ReactElement } from 'react';
import { z } from 'zod';

// Core types
export interface ToolContext {
  cache: Map<string, any>;
  fetch: (url: string, options: any) => Promise<any>;
  user?: any;
  session?: any;
}

export interface Tool<I = any, O = any> {
  name: string;
  input: z.ZodType<I>;
  execute: (params: { input: I; ctx?: ToolContext }) => Promise<O>;
  clientExecute?: (params: { input: I; ctx: ToolContext }) => Promise<O>;
  render?: (params: { data: O; input?: I }) => ReactElement;
}

// Tool builder with fluent API
class ToolBuilder<I = any, O = any> {
  private tool: Partial<Tool<I, O>> = {};

  constructor(name: string) {
    this.tool.name = name;
  }

  input<T>(schema: z.ZodType<T>): ToolBuilder<T, O> {
    this.tool.input = schema;
    return this as any;
  }

  execute<R>(fn: (params: { input: I }) => R | Promise<R>): ToolBuilder<I, R> {
    this.tool.execute = async (params) => fn(params);
    return this as any;
  }

  clientExecute(fn: (params: { input: I; ctx: ToolContext }) => O | Promise<O>): ToolBuilder<I, O> {
    this.tool.clientExecute = async (params) => fn(params);
    return this;
  }

  render(fn: (params: { data: O }) => ReactElement): ToolBuilder<I, O> {
    this.tool.render = fn;
    return this;
  }

  build(): Tool<I, O> {
    if (!this.tool.execute) {
      throw new Error(`Tool "${this.tool.name}" needs execute method`);
    }
    return this.tool as Tool<I, O>;
  }
}

// Main AUI class
class AUI {
  private tools = new Map<string, Tool>();

  // Chainable builder
  tool(name: string) {
    return new ToolBuilder(name);
  }

  // Register a built tool
  register(tool: Tool) {
    this.tools.set(tool.name, tool);
    return this;
  }

  // Get all tools
  getTools() {
    return Array.from(this.tools.values());
  }

  // Get tool by name
  getTool(name: string) {
    return this.tools.get(name);
  }

  // Execute tool
  async execute(name: string, input: any, ctx?: ToolContext) {
    const tool = this.getTool(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return tool.execute({ input, ctx });
  }
}

// Singleton instance
export const aui = new AUI();

// Re-export zod for convenience
export { z };

// Type helpers
export type InputOf<T> = T extends Tool<infer I, any> ? I : never;
export type OutputOf<T> = T extends Tool<any, infer O> ? O : never;