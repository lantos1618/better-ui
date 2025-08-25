// AUI Tool Examples
import aui, { z } from '../index';

// Simple weather tool - just 2 methods
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(Math.random() * 30) + 60, 
    city: input.city 
  }));

// Complex search tool - adds client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    await new Promise(r => setTimeout(r, 500));
    return {
      results: [
        { id: 1, title: `Result for "${input.query}"`, score: 0.95 },
        { id: 2, title: `Another result`, score: 0.87 }
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side optimization
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  });

// Calculator tool
export const calculatorTool = aui
  .tool('calculator')
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
      '/': (a: number, b: number) => a / b
    };
    return { result: ops[input.op](input.a, input.b) };
  });