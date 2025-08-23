import React from 'react';
import aui, { z } from '../index';

// Simple tool - just 2 methods (input → execute → render)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }: { input: any }) => ({ temp: 72, city: input.city }))
  .render(({ data }: { data: any }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }: { input: any }) => {
    // Mock database search
    return [
      { id: 1, title: `Result for ${input.query}` },
      { id: 2, title: `Another result for ${input.query}` }
    ];
  })
  .clientExecute(async ({ input, ctx }: { input: any; ctx: any }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }: { data: any }) => (
    <div className="search-results">
      {(data as any[]).map((item: any) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  ))
  .build();

// Export for usage
export { simpleTool, complexTool };