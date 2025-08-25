# AUI (Assistant-UI) Usage Guide

A concise tool system for AI-controlled frontend and backend operations in Next.js/Vercel.

## Quick Start

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
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
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
  .render(({ data }) => <SearchResults results={data} />)
```

## Using Tools

### In React Components

```tsx
import { useAUITool } from '@/lib/aui';

function MyComponent() {
  const { execute, loading, data, error } = useAUITool(simpleTool);
  
  const handleClick = () => {
    execute({ city: 'New York' });
  };
  
  return (
    <div>
      <button onClick={handleClick}>Get Weather</button>
      {loading && <div>Loading...</div>}
      {data && <div>{data.city}: {data.temp}°</div>}
    </div>
  );
}
```

### Direct Execution

```tsx
const result = await simpleTool.run({ city: 'London' });
console.log(result); // { temp: 72, city: 'London' }
```

## AI Control Examples

### Frontend Control

```tsx
const uiControl = aui
  .tool('ui-control')
  .input(z.object({ 
    action: z.enum(['show', 'hide', 'toggle']),
    element: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const el = document.querySelector(input.element);
    // Manipulate DOM...
    return { success: true };
  })
```

### Backend Operations

```tsx
const dbTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any()
  }))
  .execute(async ({ input }) => {
    // Database operations...
    return await db[input.operation](input.table, input.data);
  })
```

## API Routes

Create `/app/api/tools/[tool]/route.ts`:

```tsx
import aui from '@/lib/aui';

export async function POST(
  req: Request,
  { params }: { params: { tool: string } }
) {
  const input = await req.json();
  const result = await aui.execute(params.tool, input);
  return Response.json(result);
}
```

## Key Features

- **Concise API**: Define tools in 2-4 method calls
- **Type-safe**: Full TypeScript and Zod validation
- **Flexible**: Works both client and server side
- **AI-ready**: Designed for AI agents to discover and execute
- **No build step**: Tools are immediately usable without .build()

## Advanced Features

- **Middleware**: Add auth, logging, etc.
- **Caching**: Built-in client-side caching
- **Context**: Pass user session, env vars, etc.
- **Tags**: Organize and find tools by tags
- **Discovery**: AI can list and execute tools

## Examples

See `/lib/aui/examples/` for more examples:
- `user-requested.tsx` - Examples matching this API
- `ai-tools.tsx` - AI control examples
- `demo-tools.tsx` - Advanced patterns