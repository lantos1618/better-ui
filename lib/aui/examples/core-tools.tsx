import React from 'react';
import aui, { z } from '../index';

// Simple tool - just 2 methods
export const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization  
export const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulated database search
    const results = [
      { id: 1, title: `Result for: ${input.query}`, score: 0.95 },
      { id: 2, title: `Related to: ${input.query}`, score: 0.85 },
      { id: 3, title: `Also matching: ${input.query}`, score: 0.75 }
    ];
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    ctx.cache.set(input.query, data);
    return data;
  })
  .render(({ data }) => (
    <div className="search-results">
      {data.map((result: any) => (
        <div key={result.id} className="result-item">
          <h3>{result.title}</h3>
          <span className="score">Score: {result.score}</span>
        </div>
      ))}
    </div>
  ));

// Additional examples showing different patterns
export const formTool = aui
  .tool('contact')
  .input(z.object({
    name: z.string(),
    email: z.string().email(),
    message: z.string()
  }))
  .execute(async ({ input }) => {
    // Send email or save to database
    console.log('Contact form submission:', input);
    return { success: true, id: Date.now() };
  })
  .render(({ data, loading }) => {
    if (loading) return <div>Sending...</div>;
    return data.success ? 
      <div>Thank you! Your message has been sent (ID: {data.id})</div> :
      <div>Failed to send message</div>;
  });

export const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Track analytics event
    return { 
      tracked: true, 
      event: input.event,
      timestamp: new Date().toISOString()
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side tracking for immediate feedback
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(input.event, input.properties);
    }
    return ctx.fetch('/api/tools/analytics', {
      method: 'POST',
      body: JSON.stringify(input)
    }).then(r => r.json());
  });

export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional(),
    where: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Simulated database operation
    switch (input.operation) {
      case 'create':
        return { id: Date.now(), ...input.data };
      case 'read':
        return { records: [], count: 0 };
      case 'update':
        return { updated: 1 };
      case 'delete':
        return { deleted: 1 };
    }
  })
  .render(({ data, input }) => (
    <div className="db-result">
      <h4>Database {input?.operation} Result</h4>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// Export all tools for easy import
export const tools = {
  weather: simpleTool,
  search: complexTool,
  contact: formTool,
  analytics: analyticsTool,
  database: databaseTool
};