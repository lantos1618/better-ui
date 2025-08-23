import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Pattern 1: Ultra-minimal - 2 methods only
const minimalTool = aui
  .tool('minimal')
  .input(z.object({ name: z.string() }))
  .execute(async ({ input }) => `Hello, ${input.name}!`)
  .build();

// Pattern 2: Simple with render - just 3 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Pattern 3: Complex with client execution
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    return { results: [`Result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching/offline support
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    return ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
  })
  .render(({ data }) => (
    <div>
      {data.results.map((r: string, i: number) => (
        <div key={i}>{r}</div>
      ))}
    </div>
  ))
  .build();

// Pattern 4: Using the simple() helper for auto-registration
const quickTool = aui.simple(
  'greeting',
  z.object({ name: z.string() }),
  async (input) => `Welcome, ${input.name}!`,
  (data) => <h1>{data}</h1>
);

// Pattern 5: Server-only tool (no client execution)
const serverOnlyTool = aui
  .tool('database-write')
  .input(z.object({ data: z.string() }))
  .serverOnly()
  .execute(async ({ input }) => {
    // This only runs on server
    return { saved: true, id: Date.now() };
  })
  .render(({ data }) => <div>Saved with ID: {data.id}</div>)
  .build();

// Pattern 6: Using handle() for input+execute combo
const handleTool = aui
  .tool('calculate')
  .handle(
    z.object({ a: z.number(), b: z.number() }),
    async (input) => input.a + input.b
  )
  .render(({ data }) => <span>Result: {data}</span>)
  .build();

// Pattern 7: Context-aware execution
const contextTool = aui
  .tool('user-profile')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input, ctx }) => {
    // Access context in server execution
    const sessionUser = ctx?.userId;
    return { 
      userId: input.userId, 
      isSelf: sessionUser === input.userId 
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client can also use context
    const cached = ctx.cache.get(`user:${input.userId}`);
    return cached || ctx.fetch(`/api/users/${input.userId}`);
  })
  .render(({ data }) => <div>User {data.userId}</div>)
  .build();

// Pattern 8: Using run() for execute+render combo
const runTool = aui
  .tool('timestamp')
  .input(z.object({ format: z.string().optional() }))
  .run(
    async (input) => new Date().toISOString(),
    (data) => <time>{data}</time>
  )
  .build();

// Pattern 9: With metadata and description
const describedTool = aui
  .tool('analytics')
  .description('Track user analytics events')
  .metadata({ category: 'tracking', version: '1.0' })
  .input(z.object({ event: z.string(), data: z.any() }))
  .execute(async ({ input }) => ({ tracked: true, event: input.event }))
  .render(({ data }) => <div>Tracked: {data.event}</div>)
  .build();

// Pattern 10: Quick mode for auto-building
const quickModeTool = aui
  .quick('auto-build')
  .input(z.object({ msg: z.string() }))
  .execute(async ({ input }) => input.msg.toUpperCase())
  .render(({ data }) => <strong>{data}</strong>);
// No .build() needed in quick mode!

export {
  minimalTool,
  simpleTool,
  complexTool,
  quickTool,
  serverOnlyTool,
  handleTool,
  contextTool,
  runTool,
  describedTool,
  quickModeTool
};