# AUI (Assistant-UI) Quick Start

A concise tool system for AI-controlled frontend and backend operations in Next.js/Vercel.

## Installation

```tsx
import aui from '@/lib/aui';
import { z } from 'zod';
```

## Simple Tool (2 methods)

```tsx
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);
```

## Complex Tool (with client optimization)

```tsx
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);
```

## Using Tools in Components

```tsx
import { useAUITool } from '@/lib/aui';

function MyComponent() {
  const { execute, loading, data, error } = useAUITool(simpleTool);
  
  return (
    <div>
      <button onClick={() => execute({ city: 'San Francisco' })}>
        Get Weather
      </button>
      {data && simpleTool.renderer({ data })}
    </div>
  );
}
```

## AI Control

```tsx
// AI agents can discover and execute tools
async function handleAIToolCall(toolCall: { name: string; input: any }) {
  const tool = aui.get(toolCall.name);
  if (!tool) throw new Error(`Tool ${toolCall.name} not found`);
  
  return await tool.run(toolCall.input);
}

// List available tools for AI discovery
const tools = aui.list().map(tool => ({
  name: tool.name,
  description: tool.description,
  schema: tool.schema
}));
```

## API Route (already set up)

The API route at `/api/tools/[tool]/route.ts` handles server-side execution automatically.

## Key Features

- **No .build() needed** - Tools are immediately usable
- **Type-safe** - Full TypeScript and Zod validation
- **Flexible** - Server-only by default, client optimization when needed
- **AI-ready** - Designed for AI agents to discover and execute
- **React integrated** - Hooks and rendering built-in

## Full Examples

See `/examples/aui-showcase.tsx` for comprehensive examples including:
- User management
- Analytics dashboards
- File operations
- Database queries

## Testing

```bash
npm test -- --testPathPattern=aui
```

All 108 tests passing ✅