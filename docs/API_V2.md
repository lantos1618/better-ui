# Better UI - API v2 Design

> Inspired by TanStack AI's clean patterns, with Better UI's unique view integration.

## Core Principles

1. **Separation of concerns** - Definition, implementation, and view are distinct
2. **Direct input access** - `({ city })` not `({ input })`
3. **Clear naming** - `.server()` and `.client()` not `.execute()` and `.clientExecute()`
4. **Optional registry** - Standalone `tool()` works without `new AUI()`
5. **Type safety** - Input AND output schemas with Zod
6. **View integration** - Our differentiator: tools render their results

---

## API Design

### Basic Tool Definition

```typescript
import { tool } from 'better-ui';
import { z } from 'zod';

const weather = tool({
  name: 'weather',
  description: 'Get weather for a city',
  input: z.object({
    city: z.string()
  }),
  output: z.object({
    temp: z.number(),
    condition: z.string()
  }),
});
```

### Adding Server Implementation

```typescript
// Direct destructuring - no { input } wrapper
weather.server(async ({ city }) => {
  const data = await weatherAPI.get(city);
  return { temp: data.temp, condition: data.condition };
});
```

### Adding Client Implementation (Optional)

```typescript
// If not specified, auto-generates fetch to /api/tools/{name}
weather.client(async ({ city }, ctx) => {
  // Custom client logic: caching, optimistic updates, etc.
  const cached = ctx.cache.get(`weather:${city}`);
  if (cached) return cached;

  const result = await ctx.fetch('/api/weather', {
    method: 'POST',
    body: JSON.stringify({ city })
  });

  ctx.cache.set(`weather:${city}`, result);
  return result;
});
```

### Adding View (Our Differentiator)

```typescript
// Simple: just data
weather.view((data) => (
  <div className="weather-card">
    <span className="temp">{data.temp}°</span>
    <span className="condition">{data.condition}</span>
  </div>
));

// With loading/error states
weather.view((data, { loading, error }) => {
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <WeatherCard temp={data.temp} condition={data.condition} />;
});
```

---

## Fluent Builder Alternative

For those who prefer chaining:

```typescript
const search = tool('search')
  .description('Search the database')
  .input(z.object({ query: z.string() }))
  .output(z.object({ results: z.array(z.object({
    id: z.string(),
    title: z.string()
  })) }))
  .server(async ({ query }) => {
    return { results: await db.search(query) };
  })
  .view((data) => (
    <ul>
      {data.results.map(r => <li key={r.id}>{r.title}</li>)}
    </ul>
  ));
```

---

## Usage

### In AI Chat (Server)

```typescript
import { chat } from 'better-ui';
import { openai } from 'better-ui/adapters/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = chat({
    adapter: openai({ model: 'gpt-4' }),
    tools: [weather, search],
    messages,
  });

  return stream.toResponse();
}
```

### In React Components

```typescript
import { useTool } from 'better-ui/react';

function WeatherWidget({ city }) {
  const { data, loading, error } = useTool(weather, { city });

  // Option 1: Use the tool's view
  return <weather.View data={data} loading={loading} error={error} />;

  // Option 2: Custom rendering
  if (loading) return <Spinner />;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{data.temp}° in {city}</div>;
}
```

### Direct Execution

```typescript
// Server-side (in API route, server component, etc.)
const result = await weather.run({ city: 'London' });

// Or just call it
const result = await weather({ city: 'London' });
```

---

## Tool Registry (Optional)

For apps with many tools:

```typescript
import { createRegistry } from 'better-ui';

const registry = createRegistry();

registry.add(weather);
registry.add(search);

// Get all tools
registry.list();

// Find by name
registry.get('weather');

// Find by tag
registry.findByTag('api');
```

---

## Type Inference

```typescript
const weather = tool({
  name: 'weather',
  input: z.object({ city: z.string() }),
  output: z.object({ temp: z.number() }),
});

// Types are inferred
weather.server(async ({ city }) => {
  //                    ^? string
  return { temp: 72 };
  //       ^? { temp: number } - validated against output schema
});

// In React
const { data } = useTool(weather, { city: 'London' });
//      ^? { temp: number } | null
```

---

## Context Object

Available in `.server()` and `.client()`:

```typescript
interface ToolContext {
  // Common
  cache: Map<string, any>;

  // Server-only
  env?: Record<string, string>;
  headers?: Headers;
  cookies?: Record<string, string>;
  user?: any;
  session?: any;

  // Client-only
  fetch: typeof fetch;
  optimistic?: (data: Partial<TOutput>) => void;
}

weather.server(async ({ city }, ctx) => {
  const apiKey = ctx.env?.WEATHER_API_KEY;
  const userId = ctx.user?.id;
  // ...
});

weather.client(async ({ city }, ctx) => {
  ctx.optimistic?.({ temp: 70, condition: 'loading...' });
  return ctx.fetch('/api/weather', { ... });
});
```

---

## Caching (Declarative Option)

```typescript
const weather = tool({
  name: 'weather',
  input: z.object({ city: z.string() }),
  output: z.object({ temp: z.number() }),
  cache: {
    ttl: 60000, // 1 minute
    key: ({ city }) => `weather:${city}`,
  },
});
```

---

## Migration from v1

```typescript
// v1 (old)
const aui = new AUI();
const weather = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    return { temp: 72, city: input.city };
  })
  .clientExecute(async ({ input, ctx }) => {
    return ctx.fetch('/api/weather', { ... });
  })
  .render(({ data }) => <div>{data.temp}</div>);

// v2 (new)
const weather = tool({
  name: 'weather',
  input: z.object({ city: z.string() }),
  output: z.object({ temp: z.number(), city: z.string() }),
})
.server(async ({ city }) => {
  return { temp: 72, city };
})
.client(async ({ city }, ctx) => {
  return ctx.fetch('/api/weather', { ... });
})
.view((data) => <div>{data.temp}</div>);
```

---

## Comparison with TanStack AI

| Feature | TanStack AI | Better UI v2 |
|---------|-------------|--------------|
| Tool definition | `toolDefinition({...})` | `tool({...})` |
| Server impl | `.server()` | `.server()` |
| Client impl | `.client()` | `.client()` |
| Input schema | `inputSchema` | `input` |
| Output schema | - | `output` |
| View/Render | - | `.view()` |
| React hooks | `useChat()` | `useTool()`, `useChat()` |
| Caching | Manual | Declarative option |
| Registry | - | Optional |

**Key differentiator**: Better UI includes view integration for rendering tool results in UI.

---

## File Structure

```
src/
  tool.ts           # New tool() function
  types.ts          # ToolDefinition, ToolContext, etc.
  registry.ts       # Optional registry
  react/
    useTool.ts      # React hook
    ToolView.tsx    # <tool.View /> component
  adapters/
    openai.ts       # OpenAI adapter
    anthropic.ts    # Anthropic adapter
```
