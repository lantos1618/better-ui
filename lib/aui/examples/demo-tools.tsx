'use client';

import { z } from 'zod';
import aui from '../index';

// Simple weather tool - just 2 methods as requested
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city,
    conditions: 'sunny',
    humidity: 65 
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-sm text-gray-600">{data.conditions}</p>
    </div>
  ));

// Complex search tool with client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side: hit the database
    const results = await mockDatabaseSearch(input.query, input.limit);
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first, then fetch
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
    
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  })
  .render(({ data, loading }) => (
    <div className="space-y-2">
      {loading && <div className="animate-pulse">Searching...</div>}
      {data?.map((item: any) => (
        <div key={item.id} className="p-3 bg-white border rounded hover:shadow-md transition-shadow">
          <h4 className="font-semibold">{item.title}</h4>
          <p className="text-sm text-gray-600">{item.description}</p>
        </div>
      ))}
    </div>
  ));

// Mock database search function
async function mockDatabaseSearch(query: string, limit: number = 10) {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
    id: `result-${i}`,
    title: `${query} result ${i + 1}`,
    description: `This is a search result for "${query}"`,
    relevance: 1 - (i * 0.1)
  }));
}

// Form submission tool
export const formTool = aui
  .tool('submitForm')
  .input(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    message: z.string().min(10)
  }))
  .execute(async ({ input }) => {
    // Server-side form processing
    console.log('Processing form:', input);
    return { 
      success: true, 
      message: `Thank you ${input.name}, we\'ll respond to ${input.email} soon!` 
    };
  })
  .render(({ data, error }) => {
    if (error) {
      return <div className="text-red-500">Error: {error.message}</div>;
    }
    if (data?.success) {
      return <div className="text-green-600 p-4 bg-green-50 rounded">{data.message}</div>;
    }
    return null;
  });

// Analytics tool with middleware
export const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional()
  }))
  .middleware(async ({ input, ctx, next }) => {
    // Add timestamp before execution
    input.properties = {
      ...input.properties,
      timestamp: new Date().toISOString(),
      sessionId: ctx.session?.id
    };
    return next();
  })
  .execute(async ({ input }) => {
    console.log('Analytics event:', input);
    return { tracked: true, event: input.event };
  })
  .render(({ data }) => (
    <div className="text-xs text-gray-500">
      Event &ldquo;{data.event}&rdquo; tracked
    </div>
  ));