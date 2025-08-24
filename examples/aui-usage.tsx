import React from 'react';
import { z } from 'zod';
import aui from '@/lib/aui';
import { ToolRenderer } from '@/lib/aui/client/components';

// Mock database for example
const db = {
  search: async (query: string) => {
    return [
      { id: 1, title: `Result for ${query}`, score: 0.95 },
      { id: 2, title: `Another ${query} match`, score: 0.85 }
    ];
  }
};

// Simple search results component
function SearchResults({ results }: { results: any[] }) {
  return (
    <div className="space-y-2">
      {results.map((item) => (
        <div key={item.id} className="p-2 border rounded">
          {item.title} (score: {item.score})
        </div>
      ))}
    </div>
  );
}

// Simple tool - just 2 methods (input + execute minimum, render optional)
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
    // Server-side execution (when called from API)
    const results = await db.search(input.query);
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();

// Register tools globally
aui.register(simpleTool);
aui.register(complexTool);

// Or use directly in a component
export function MyComponent() {
  return (
    <ToolRenderer 
      toolCall={{ 
        id: '1', 
        toolName: 'weather', 
        input: { city: 'SF' } 
      }}
      tool={simpleTool}
    />
  );
}