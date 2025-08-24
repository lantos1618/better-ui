import React from 'react';
import aui, { z } from '../index';

// ============================================================================
// AUI - EXACT API AS REQUESTED BY USER
// ============================================================================

// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    const results = await db.search(input.query);
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();

// Mock implementations for demo
const db = {
  search: async (query: string) => [
    { id: 1, title: `Result for ${query}`, score: 0.95 },
    { id: 2, title: `Another result for ${query}`, score: 0.87 }
  ]
};

const SearchResults = ({ results }: { results: any[] }) => (
  <div className="search-results">
    {results.map((item) => (
      <div key={item.id} className="result-item">
        <h4>{item.title}</h4>
        {item.score && <span>Score: {item.score}</span>}
      </div>
    ))}
  </div>
);

// Export for usage
export { simpleTool, complexTool };