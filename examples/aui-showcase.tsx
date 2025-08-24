'use client';

import aui, { z } from '@/lib/aui';

// Simple tool - just 2 methods (input + execute + render)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    return { results: [`Result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);

// Ultra-concise tool registration
const tools = {
  weather: simpleTool,
  search: complexTool,
  
  // Even simpler inline definition
  calculator: aui
    .tool('calculator')
    .input(z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }))
    .execute(({ input }) => {
      const ops = { '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => a / b };
      return { result: ops[input.op](input.a, input.b) };
    })
    .render(({ data }) => <span className="font-mono">{data.result}</span>),
    
  // Database tool with caching
  userLookup: aui
    .tool('userLookup')
    .input(z.object({ userId: z.string() }))
    .execute(async ({ input }) => {
      // Simulate DB query
      return { id: input.userId, name: 'John Doe', email: 'john@example.com' };
    })
    .clientExecute(async ({ input, ctx }) => {
      const key = `user:${input.userId}`;
      if (ctx.cache.has(key)) return ctx.cache.get(key);
      
      const user = await ctx.fetch(`/api/users/${input.userId}`).then(r => r.json());
      ctx.cache.set(key, user);
      return user;
    })
    .render(({ data }) => (
      <div className="p-2 border rounded">
        <strong>{data.name}</strong>
        <p className="text-sm text-gray-600">{data.email}</p>
      </div>
    )),
};

// Component to demonstrate usage
function SearchResults({ results }: { results: string[] }) {
  return (
    <ul className="space-y-1">
      {results.map((r, i) => (
        <li key={i} className="p-2 bg-gray-50 rounded">{r}</li>
      ))}
    </ul>
  );
}

export { tools };