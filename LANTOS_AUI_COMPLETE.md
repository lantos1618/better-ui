# Lantos AUI - Ultra-Concise AI Control API

## Overview

Lantos AUI (Assistant UI) is an ultra-concise API for AI-controlled frontend/backend operations in Next.js/Vercel applications. It provides a fluent, type-safe interface for defining tools that can be executed on both server and client, with built-in React rendering support.

## Key Features

- ✨ **Ultra-concise API** - 2 methods minimum for simple tools
- 🔄 **No .build() required** - Tools are immediately usable
- 🎯 **Full TypeScript support** - Complete type inference
- 🚀 **Dual execution** - Server-side and optional client-side paths
- ⚛️ **React-first** - Built-in component rendering
- 🤖 **AI-optimized** - Retry logic, caching, and error handling
- 📦 **Batch operations** - Define multiple tools at once

## Installation

```bash
npm install zod
# Already included in your Next.js project
```

## Quick Start

### 1. Simple Tool (2 methods)

```tsx
import aui, { z } from '@/lib/aui/lantos-aui';

const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }));

// Use it
const result = await weatherTool.run({ city: 'SF' });
```

### 2. With Rendering (3 methods)

```tsx
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);
```

### 3. With Client Optimization (4 methods)

```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);
```

## API Patterns

### Ultra-Short Syntax

```tsx
// No input
aui.do('time', () => new Date().toISOString());

// With input
aui.doWith('greet', z.object({ name: z.string() }), 
  ({ name }) => `Hello, ${name}!`);

// Complete simple tool
aui.simple('weather', schema, handler, render);
```

### AI-Optimized Tools

```tsx
aui.ai('search', {
  input: z.object({ query: z.string() }),
  execute: async ({ input }) => /* ... */,
  retry: 3,      // Automatic retry on failure
  cache: true,   // Built-in caching
  render: ({ data }) => /* ... */
});
```

### Batch Definition

```tsx
const tools = aui.defineTools({
  add: {
    input: z.object({ a: z.number(), b: z.number() }),
    execute: ({ input }) => ({ result: input.a + input.b })
  },
  subtract: {
    input: z.object({ a: z.number(), b: z.number() }),
    execute: ({ input }) => ({ result: input.a - input.b })
  }
});

// Or even simpler
const tools = aui.batch({
  double: (n: number) => n * 2,
  square: (n: number) => n * n
});
```

## React Integration

### Using Hooks

```tsx
import { useAUITool } from '@/lib/aui/client/hooks';

function WeatherWidget() {
  const weather = useAUITool(weatherTool, {
    cache: true,
    debounce: 500,
    onSuccess: (data) => console.log('Weather loaded:', data)
  });

  return (
    <div>
      <button onClick={() => weather.execute({ city: 'SF' })}>
        Get Weather
      </button>
      {weather.loading && <p>Loading...</p>}
      {weather.data && weather.render?.()}
    </div>
  );
}
```

### With Provider

```tsx
import { AUIProvider } from '@/lib/aui/client/provider';

export default function App({ children }) {
  return (
    <AUIProvider 
      baseUrl="/api/aui/lantos"
      user={{ id: 123 }}
    >
      {children}
    </AUIProvider>
  );
}
```

### Multi-Tool Management

```tsx
import { useAUI } from '@/lib/aui/client/hooks';

function Dashboard() {
  const aui = useAUI();

  const handleAnalytics = async () => {
    await aui.executeTool('analytics', { metric: 'views' });
    const result = aui.getResult('analytics');
    console.log(result);
  };

  return (
    <div>
      {aui.isLoading('analytics') && <Spinner />}
      {aui.getError('analytics') && <Error />}
      <button onClick={handleAnalytics}>Load Analytics</button>
    </div>
  );
}
```

## Advanced Features

### Direct Execution

```tsx
// Execute by name
const result = await aui.execute('toolName', input, context);

// Check existence
if (aui.has('toolName')) {
  // Tool exists
}

// Get all tools
const tools = aui.getTools();
const names = aui.getToolNames();
```

### Context Management

```tsx
// Create custom context
const ctx = aui.createContext({
  user: { id: 123, name: 'Alice' },
  session: 'abc123',
  cache: new Map()
});

// Use in execution
const result = await tool.run(input, ctx);
```

### Type Inference

```tsx
import type { InferToolInput, InferToolOutput } from '@/lib/aui/lantos-aui';

const myTool = aui.tool('test')
  .input(z.object({ name: z.string() }))
  .execute(async ({ input }) => ({ greeting: `Hello ${input.name}` }));

type Input = InferToolInput<typeof myTool>;   // { name: string }
type Output = InferToolOutput<typeof myTool>; // { greeting: string }
```

## Server Setup

```tsx
// app/api/aui/lantos/execute/route.ts
import { aui } from '@/lib/aui/lantos-aui';

export async function POST(request) {
  const { tool: toolName, input } = await request.json();
  
  const tool = aui.get(toolName);
  if (!tool) {
    return Response.json({ error: 'Tool not found' }, { status: 404 });
  }
  
  const result = await tool.run(input);
  return Response.json({ success: true, data: result });
}
```

## Testing

```tsx
import { describe, it, expect } from '@jest/globals';
import aui from '@/lib/aui/lantos-aui';

describe('My Tool', () => {
  it('should execute correctly', async () => {
    const tool = aui.simple(
      'test',
      z.object({ value: z.number() }),
      (input) => ({ doubled: input.value * 2 })
    );
    
    const result = await tool.run({ value: 5 });
    expect(result).toEqual({ doubled: 10 });
  });
});
```

## Performance

- Tool registration: < 1ms
- Client cache hits: < 10ms
- Typical server execution: < 500ms
- Zero runtime overhead for unused features

## Best Practices

1. **Start simple**: Use `do()` or `simple()` for basic tools
2. **Add complexity gradually**: Only add client execution when needed
3. **Use caching wisely**: Enable for expensive operations
4. **Type your tools**: Leverage TypeScript for better DX
5. **Test thoroughly**: Write tests for both server and client paths

## Examples

See `/app/lantos-aui-showcase/page.tsx` for a complete showcase of all features.

## License

MIT