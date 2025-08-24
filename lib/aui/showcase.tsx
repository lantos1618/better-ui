import React from 'react';
import { z } from 'zod';
import aui from './index';

// ==========================================
// SHOWCASE: Concise AUI Tool Creation API
// ==========================================

// 1. MINIMAL TOOL - Just 4 methods!
const minimalTool = aui
  .tool('minimal')
  .input(z.object({ text: z.string() }))
  .execute(async ({ input }) => input.text.toUpperCase())
  .render(({ data }) => <div>{data}</div>)
  .build();

// 2. SIMPLE TOOL - Basic server execution
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => (
    <div className="weather">
      {data.city}: {data.temp}°F
    </div>
  ))
  .build();

// 3. COMPLEX TOOL - With client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server: database search
    return await db.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client: add caching for performance
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();

// 4. FULL-FEATURED TOOL - All optional methods
const advancedTool = aui
  .tool('advanced')
  .description('Advanced tool with all features')
  .input(z.object({ 
    id: z.number(),
    options: z.object({
      format: z.enum(['json', 'html'])
    }).optional()
  }))
  .output(z.object({
    result: z.string(),
    timestamp: z.number()
  }))
  .metadata({
    category: 'data',
    rateLimit: 100
  })
  .execute(async ({ input, ctx }) => ({
    result: `Processed ${input.id}`,
    timestamp: Date.now()
  }))
  .clientExecute(async ({ input, ctx }) => {
    return ctx.cache.get(input.id) || 
           ctx.fetch(`/api/items/${input.id}`);
  })
  .render(({ data, input }) => (
    <div>
      <h3>Item {input.id}</h3>
      <p>{data.result}</p>
      <time>{new Date(data.timestamp).toLocaleString()}</time>
    </div>
  ))
  .build();

// 5. SERVER-ONLY TOOL
const serverOnlyTool = aui
  .tool('database')
  .input(z.object({ sql: z.string() }))
  .serverOnly()
  .execute(async ({ input }) => {
    // This only runs on server
    return await db.query(input.sql);
  })
  .render(({ data }) => <DataTable rows={data} />)
  .build();

// Mock components for showcase
const SearchResults = ({ results }: any) => <div>{JSON.stringify(results)}</div>;
const DataTable = ({ rows }: any) => <table>{/* ... */}</table>;
const db = { 
  search: async (q: string) => [{ id: 1, title: q }],
  query: async (sql: string) => []
};

export const showcaseTools = [
  minimalTool,
  weatherTool,
  searchTool,
  advancedTool,
  serverOnlyTool
];