# Better UI

> A minimal, type-safe AI-first UI framework for building tools

[![npm version](https://img.shields.io/npm/v/@lantos1618/better-ui.svg)](https://www.npmjs.com/package/@lantos1618/better-ui)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## What is Better UI?

Better UI provides a clean, fluent API for creating tools that AI assistants can execute. Define input/output schemas with Zod, implement server and client logic separately, and render results with React components.

**Key differentiator**: Unlike other AI tool libraries, Better UI includes **view integration** - tools can render their own results in UI.

## Installation

```bash
npm install @lantos1618/better-ui zod
```

## Quick Start

```typescript
import { tool } from '@lantos1618/better-ui';
import { z } from 'zod';

const weather = tool({
  name: 'weather',
  description: 'Get weather for a city',
  input: z.object({ city: z.string() }),
  output: z.object({ temp: z.number(), condition: z.string() }),
});

// Server implementation (runs on server)
weather.server(async ({ city }) => {
  const data = await weatherAPI.get(city);
  return { temp: data.temp, condition: data.condition };
});

// View for rendering results (our differentiator!)
weather.view((data) => (
  <div className="weather-card">
    <span>{data.temp}°</span>
    <span>{data.condition}</span>
  </div>
));
```

## Core Concepts

### 1. Tool Definition

```typescript
const myTool = tool({
  name: 'myTool',
  description: 'What this tool does',
  input: z.object({ /* input schema */ }),
  output: z.object({ /* output schema */ }),
  tags: ['category', 'type'],
  cache: { ttl: 60000 }, // optional caching
});
```

### 2. Server Implementation

The `.server()` method defines logic that runs on the server (API routes, server components):

```typescript
myTool.server(async ({ query }, ctx) => {
  // Direct access to databases, secrets, file system
  const results = await db.search(query);
  return { results };
});
```

### 3. Client Implementation (Optional)

The `.client()` method defines what happens when called from the browser. If not specified, auto-fetches to `/api/tools/execute`.

```typescript
myTool.client(async ({ query }, ctx) => {
  // Custom client logic: caching, optimistic updates, etc.
  const cached = ctx.cache.get(query);
  if (cached) return cached;

  return ctx.fetch('/api/search', {
    method: 'POST',
    body: JSON.stringify({ query })
  });
});
```

### 4. View (Our Differentiator)

The `.view()` method defines how to render the tool's results:

```typescript
myTool.view((data, { loading, error }) => {
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <Results items={data.results} />;
});
```

## Fluent Builder Alternative

```typescript
const search = tool('search')
  .description('Search the database')
  .input(z.object({ query: z.string() }))
  .output(z.object({ results: z.array(z.string()) }))
  .server(async ({ query }) => ({ results: await db.search(query) }))
  .view((data) => <ResultsList items={data.results} />);
```

## React Usage

```typescript
import { useTool } from '@lantos1618/better-ui';

function WeatherWidget({ city }) {
  const { data, loading, error, execute } = useTool(weather);

  return (
    <div>
      <button onClick={() => execute({ city })}>Get Weather</button>
      {loading && <Spinner />}
      {error && <div>Error: {error.message}</div>}
      {data && <weather.View data={data} />}
    </div>
  );
}

// Or with auto-execution
function WeatherWidget({ city }) {
  const { data, loading } = useTool(weather, { city }, { auto: true });
  return <weather.View data={data} loading={loading} />;
}
```

## AI Integration

### With Vercel AI SDK

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4'),
    messages,
    tools: {
      weather: weather.toAITool(),
      search: search.toAITool(),
    },
  });

  return result.toDataStreamResponse();
}
```

## API Reference

### `tool(config)` or `tool(name)`

Create a new tool with object config or fluent builder.

```typescript
// Object config
const t = tool({
  name: string,
  description?: string,
  input: ZodSchema,
  output?: ZodSchema,
  tags?: string[],
  cache?: { ttl: number, key?: (input) => string },
});

// Fluent builder
const t = tool('name')
  .description(string)
  .input(ZodSchema)
  .output(ZodSchema)
  .tags(...string[])
  .cache({ ttl, key? });
```

### `.server(handler)`

Define server-side implementation.

```typescript
t.server(async (input, ctx) => {
  // ctx.env, ctx.headers, ctx.user, ctx.session available
  return result;
});
```

### `.client(handler)`

Define client-side implementation (optional).

```typescript
t.client(async (input, ctx) => {
  // ctx.cache, ctx.fetch, ctx.optimistic available
  return result;
});
```

### `.view(component)`

Define React component for rendering results.

```typescript
t.view((data, { loading, error }) => <Component data={data} />);
```

### `useTool(tool, input?, options?)`

React hook for executing tools.

```typescript
const {
  data,      // Result data
  loading,   // Loading state
  error,     // Error if any
  execute,   // Execute function
  reset,     // Reset state
  executed,  // Has been executed
} = useTool(myTool, initialInput, {
  auto: false,      // Auto-execute on mount
  onSuccess: (data) => {},
  onError: (error) => {},
});
```

## Project Structure

```
src/
  tool.tsx          # Core tool() API
  react/
    useTool.ts      # React hook
  index.ts          # Main exports

app/
  demo/             # Demo page
  api/chat/         # Chat API route
  api/tools/        # Tool execution API

lib/
  tools.tsx         # Example tool definitions

docs/
  API_V2.md         # Full API documentation
```

## Development

```bash
npm install
npm run dev          # Run dev server
npm run build:lib    # Build library
npm run build        # Build everything
npm run type-check   # TypeScript check
```

## License

MIT
