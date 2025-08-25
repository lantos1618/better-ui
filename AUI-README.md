# AUI (Assistant-UI) System

A concise and powerful tool system for enabling AI to control both frontend and backend in Next.js/Vercel applications.

## Quick Start

```tsx
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
```

## Features

- **Concise API**: No `.build()` methods required - tools are ready to use immediately
- **Type-safe**: Full TypeScript support with Zod schema validation
- **Dual execution**: Server-side and client-side execution modes
- **Caching**: Built-in cache support for client-side optimization
- **Middleware**: Composable middleware for cross-cutting concerns
- **React integration**: Render methods for UI components
- **AI Control**: Enable AI to control both frontend and backend operations

## Core Methods

### Essential Methods (Simple Tools)
- `.tool(name)` - Create a new tool
- `.input(schema)` - Define input validation with Zod
- `.execute(handler)` - Server-side execution logic
- `.render(component)` - React component for rendering results

### Advanced Methods (Complex Tools)
- `.clientExecute(handler)` - Client-side execution with caching
- `.middleware(handler)` - Add middleware for logging, auth, etc.
- `.describe(text)` - Add tool description
- `.tag(...tags)` - Tag tools for discovery

## Examples

### Weather Tool (Simple)
```tsx
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city,
    conditions: 'sunny'
  }))
  .render(({ data }) => (
    <div>{data.city}: {data.temp}°F - {data.conditions}</div>
  ));
```

### Search with Caching (Complex)
```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    return await db.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    const data = await result.json();
    ctx.cache.set(cacheKey, data);
    return data;
  })
  .render(({ data }) => <SearchResults results={data} />);
```

### AI Control Tools

#### DOM Manipulation
```tsx
const domTool = aui
  .tool('dom')
  .input(z.object({
    action: z.enum(['click', 'type', 'scroll', 'focus']),
    selector: z.string(),
    value: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    // Perform action...
    return { success: true };
  });
```

#### Database Operations
```tsx
const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['find', 'create', 'update', 'delete']),
    collection: z.string(),
    query: z.record(z.any())
  }))
  .execute(async ({ input }) => {
    // Server-side database operation
    return await db[input.operation](input.collection, input.query);
  });
```

## Using Tools

### Direct Execution
```tsx
const result = await weatherTool.run({ city: 'NYC' });
```

### With Context
```tsx
const ctx = {
  cache: new Map(),
  fetch: globalThis.fetch,
  isServer: false
};

const result = await searchTool.run({ query: 'test' }, ctx);
```

### Via Registry
```tsx
const tool = aui.get('weather');
const result = await aui.execute('weather', { city: 'NYC' });
```

## Tool Discovery

```tsx
// Find by tag
const apiTools = aui.findByTag('api');
const publicTools = aui.findByTags('api', 'public');

// List all tools
const allTools = aui.list();
const toolNames = aui.getToolNames();
```

## Middleware

```tsx
const analyticsTool = aui
  .tool('analytics')
  .middleware(async ({ input, next }) => {
    console.log('Before:', input);
    const result = await next();
    console.log('After:', result);
    return result;
  })
  .execute(async ({ input }) => {
    // Track event
    return { tracked: true };
  });
```

## Demo Pages

- `/aui-clean` - Clean demo showcasing the concise API
- `/aui-demo` - Interactive demo with various tool examples
- `/aui-showcase` - Comprehensive showcase of all features

## Architecture

```
lib/aui/
├── index.ts          # Main export and AUI class
├── core.ts           # AUITool class and interfaces
├── ai-control.ts     # AI control system
├── client-control.ts # Client-side control
├── tools/            # Pre-built tools
├── hooks/            # React hooks
└── examples/         # Example implementations
```

## Key Benefits

1. **No Build Step**: Tools work immediately without `.build()`
2. **Progressive Enhancement**: Start simple, add complexity as needed
3. **Type Safety**: Full TypeScript and Zod validation
4. **AI-Ready**: Designed for AI agents to control UI and backend
5. **Performance**: Client-side caching and optimization
6. **Developer Experience**: Clean, intuitive API

## Next Steps

1. Explore the demo at `/aui-clean`
2. Check examples in `lib/aui/examples/concise-api.tsx`
3. Run tests with `npm test lib/aui/__tests__/concise-api.test.ts`
4. Start building your own tools!