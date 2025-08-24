import React from 'react';
import aui, { z } from './aui';

// Simple tool - just 2 methods
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
    const results = await fetch(`/api/search?q=${input.query}`).then(r => r.json());
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => <SearchResults results={data} />);

// Component for search results
function SearchResults({ results }: { results: any[] }) {
  return (
    <div className="search-results">
      {results.map((item, i) => (
        <div key={i} className="result-item">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  );
}

// More examples
const calculatorTool = aui
  .tool('calculator')
  .input(z.object({ 
    a: z.number(), 
    b: z.number(), 
    op: z.enum(['+', '-', '*', '/']) 
  }))
  .execute(({ input }) => {
    const { a, b, op } = input;
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
      default: throw new Error('Invalid operation');
    }
  })
  .render(({ data }) => <div>Result: {data}</div>);

const databaseTool = aui
  .tool('database')
  .input(z.object({
    action: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side database operation
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side optimistic updates
    if (input.action === 'read') {
      const cacheKey = `${input.table}:${JSON.stringify(input.data)}`;
      const cached = ctx.cache.get(cacheKey);
      if (cached) return cached;
    }
    
    const result = await ctx.fetch('/api/tools/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    if (input.action === 'read') {
      const cacheKey = `${input.table}:${JSON.stringify(input.data)}`;
      ctx.cache.set(cacheKey, result);
    }
    
    return result;
  })
  .render(({ data }) => (
    <div className="db-result">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// Export all tools
export const tools = {
  weather: simpleTool,
  search: complexTool,
  calculator: calculatorTool,
  database: databaseTool
};

export default tools;