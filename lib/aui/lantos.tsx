/**
 * Lantos AUI - Ultra-concise API for AI-controlled frontend/backend operations
 * 
 * Core philosophy:
 * - Minimal boilerplate
 * - Intelligent defaults
 * - Progressive enhancement
 * - AI-first design
 */

import React from 'react';
import aui, { z } from './lantos/index';

// -----------------------------------------------------------------------------
// SIMPLE TOOLS - Just 2 required methods (input + execute)
// -----------------------------------------------------------------------------

// Weather tool - minimal setup
export const weather = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }));

// Calculator - pure function
export const calc = aui
  .tool('calc')
  .input(z.object({ 
    a: z.number(), 
    b: z.number(), 
    op: z.enum(['+', '-', '*', '/'])
  }))
  .execute(({ input }) => {
    const ops = {
      '+': (a: number, b: number) => a + b,
      '-': (a: number, b: number) => a - b,
      '*': (a: number, b: number) => a * b,
      '/': (a: number, b: number) => a / b,
    };
    return { result: ops[input.op](input.a, input.b) };
  });

// -----------------------------------------------------------------------------
// COMPLEX TOOLS - Add client optimization when needed
// -----------------------------------------------------------------------------

// Search with caching
export const search = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server: hit database
    return { results: [`Result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client: check cache first
    const cached = ctx.cache?.get(input.query);
    return cached || ctx.fetch('/api/aui/search', { body: input });
  })
  .render(({ data }) => <div>{data.results.join(', ')}</div>);

// -----------------------------------------------------------------------------
// ULTRA-CONCISE PATTERNS
// -----------------------------------------------------------------------------

// Pattern 1: Random number generator tool
const random = aui
  .tool('random')
  .input(z.object({ min: z.number(), max: z.number() }))
  .execute(({ input }) => ({ value: Math.random() * (input.max - input.min) + input.min }));

// -----------------------------------------------------------------------------
// AI CONTROL PATTERNS
// -----------------------------------------------------------------------------

// Frontend control
export const uiControl = aui
  .tool('ui')
  .input(z.object({
    action: z.enum(['show', 'hide', 'update']),
    selector: z.string(),
    value: z.any().optional()
  }))
  .clientExecute(({ input }) => {
    const el = document.querySelector(input.selector);
    if (!el) return { error: 'Not found' };
    
    switch(input.action) {
      case 'show': (el as HTMLElement).style.display = 'block'; break;
      case 'hide': (el as HTMLElement).style.display = 'none'; break;
      case 'update': el.textContent = String(input.value); break;
    }
    return { success: true };
  });

// Backend control
export const processControl = aui
  .tool('process')
  .input(z.object({
    action: z.enum(['start', 'stop', 'restart']),
    service: z.string()
  }))
  .execute(async ({ input }) => {
    // Simulate process control
    return { 
      service: input.service,
      status: `${input.action}ed`,
      pid: Math.floor(Math.random() * 10000)
    };
  });

// Database operations
export const db = aui
  .tool('db')
  .input(z.object({
    operation: z.enum(['find', 'create', 'update', 'delete']),
    collection: z.string(),
    data: z.any().optional(),
    filter: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate DB operations
    switch(input.operation) {
      case 'find': return { data: [] };
      case 'create': return { id: Date.now() };
      case 'update': return { modified: 1 };
      case 'delete': return { deleted: 1 };
    }
  });

// -----------------------------------------------------------------------------
// EXPORT ALL TOOLS FOR AI
// -----------------------------------------------------------------------------

export const allTools = aui.list();

// Helper to execute any tool by name
export async function executeAITool(name: string, input: any) {
  const tool = aui.get(name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool.run(input);
}

// Export types for TypeScript
export type ToolInput<T extends keyof typeof allTools> = 
  typeof allTools[T] extends { input: infer I } ? I : never;

export type ToolOutput<T extends keyof typeof allTools> = 
  typeof allTools[T] extends { execute: (...args: any[]) => Promise<infer O> } ? O : never;