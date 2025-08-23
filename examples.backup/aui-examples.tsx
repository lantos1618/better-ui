import React from 'react';
import { z } from 'zod';
import aui from '@/lib/aui';

// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }: { input: { city: string } }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }: { input: { query: string } }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: JSON.stringify(input) });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();

// Tool with description (optional)
const descriptiveTool = aui
  .tool('calculator')
  .description('Perform mathematical calculations')
  .input(z.object({
    a: z.number(),
    b: z.number(),
    operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
  }))
  .execute(async ({ input }) => {
    const operations = {
      add: (a: number, b: number) => a + b,
      subtract: (a: number, b: number) => a - b,
      multiply: (a: number, b: number) => a * b,
      divide: (a: number, b: number) => a / b,
    };
    return {
      result: operations[input.operation](input.a, input.b),
      expression: `${input.a} ${input.operation} ${input.b}`
    };
  })
  .render(({ data }) => (
    <div className="p-4 bg-gray-100 rounded">
      <code>{data.expression} = {data.result}</code>
    </div>
  ))
  .build();

// Minimal tool - AI can control frontend
const minimalTool = aui
  .tool('display')
  .input(z.object({ message: z.string() }))
  .execute(async ({ input }) => input)
  .render(({ data }) => <div>{data.message}</div>)
  .build();

// Tool with context usage
const contextAwareTool = aui
  .tool('user-data')
  .input(z.object({ field: z.string() }))
  .execute(async ({ input, ctx }) => {
    // Access context for user info, session, etc.
    const userId = ctx.userId;
    const cached = ctx.cache.get(`user:${userId}:${input.field}`);
    return cached || { field: input.field, value: 'N/A' };
  })
  .render(({ data }) => <div>{data.field}: {data.value}</div>)
  .build();

// Register tools globally
aui.register(simpleTool);
aui.register(complexTool);
aui.register(descriptiveTool);
aui.register(minimalTool);
aui.register(contextAwareTool);

// Export for use in components
export { simpleTool, complexTool, descriptiveTool, minimalTool, contextAwareTool };

// Usage in React component
function SearchResults({ results }: { results: any[] }) {
  return (
    <div className="space-y-2">
      {results.map((item, i) => (
        <div key={i} className="p-2 border rounded">
          {item.title}
        </div>
      ))}
    </div>
  );
}

// Mock db for example
const db = {
  search: async (query: string) => {
    return [
      { title: `Result 1 for ${query}` },
      { title: `Result 2 for ${query}` }
    ];
  }
};