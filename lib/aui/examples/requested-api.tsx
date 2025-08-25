import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Simple tool - just 2 methods (exactly as requested)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization (exactly as requested)
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulating db.search(input.query)
    const db = {
      search: async (query: string) => [
        { id: 1, title: `Result for ${query}` },
        { id: 2, title: `Another result for ${query}` }
      ]
    };
    return db.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    }).then(r => r.json());
  })
  .render(({ data }) => (
    <div className="search-results">
      {data.map((item: any) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  ));

// Export for use in AI agents
export const tools = {
  weather: simpleTool,
  search: complexTool
};

// Usage example for AI agents
export async function handleAIToolCall(toolName: string, input: any) {
  const tool = aui.get(toolName);
  if (!tool) throw new Error(`Tool ${toolName} not found`);
  
  // Execute on server or client based on context
  const result = await tool.run(input);
  
  // Render if needed
  if (tool.renderer) {
    return tool.renderer({ data: result, input });
  }
  
  return result;
}

export { simpleTool, complexTool };