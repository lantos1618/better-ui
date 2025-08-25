import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Simple tool - just 2 methods (execute + render)
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
    const response = await fetch('/api/db/search', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input) 
    }).then(r => r.json());
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.map((item: any) => (
        <div key={item.id} className="p-2 border rounded">
          {item.title}
        </div>
      ))}
    </div>
  ));

// Tool with middleware for auth/logging
const protectedTool = aui
  .tool('admin-action')
  .input(z.object({ action: z.string() }))
  .middleware(async ({ input, ctx, next }) => {
    if (!ctx?.user) throw new Error('Auth required');
    console.log(`User ${ctx.user.id} performing ${input.action}`);
    return next();
  })
  .execute(async ({ input }) => ({ 
    success: true, 
    action: input.action 
  }))
  .render(({ data }) => (
    <div className="text-green-600">
      ✓ {data.action} completed
    </div>
  ));

// Minimal tool - execute only (no render needed)
const apiTool = aui
  .tool('api-call')
  .input(z.object({ endpoint: z.string() }))
  .execute(async ({ input }) => {
    const res = await fetch(input.endpoint);
    return res.json();
  });

export { simpleTool, complexTool, protectedTool, apiTool };