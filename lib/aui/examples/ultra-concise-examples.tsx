import React from 'react';
import { z } from 'zod';
import aui from '../ultra-concise';

// ✨ Simple tool - just 2 methods, no .build() needed!
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// ✨ Complex tool with client optimization - still no .build()!
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    return { results: [`Result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache?.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => (
    <div>
      {data.results.map((r, i) => <div key={i}>{r}</div>)}
    </div>
  ));

// ✨ Even simpler - input can be inferred!
const minimalTool = aui
  .tool('greet')
  .execute(async (input: { name: string }) => `Hello, ${input.name}!`)
  .render(({ data }) => <div>{data}</div>);

// ✨ Server-only tool (no client execution)
const serverOnlyTool = aui
  .tool('database-query')
  .input(z.object({ sql: z.string() }))
  .execute(async ({ input }) => {
    // This only runs on server
    return { rows: ['data'] };
  })
  .render(({ data }) => <pre>{JSON.stringify(data, null, 2)}</pre>);

// ✨ Tool with just execute (render is optional)
const apiTool = aui
  .tool('api-call')
  .input(z.object({ endpoint: z.string() }))
  .execute(async ({ input }) => {
    const response = await fetch(input.endpoint);
    return await response.json();
  });

// ✨ Using the even shorter alias
const quickTool = aui
  .t('quick')
  .execute(async () => 'Quick response!')
  .render(({ data }) => <span>{data}</span>);

export {
  simpleTool,
  complexTool,
  minimalTool,
  serverOnlyTool,
  apiTool,
  quickTool
};