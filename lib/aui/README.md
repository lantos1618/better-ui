# AUI (Assistant-UI) System

Clean, concise API for AI tool calls that control both frontend and backend in Next.js/Vercel.

## Quick Start

```tsx
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

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
  .render(({ data }) => <SearchResults results={data} />);
```

## Features

- **Clean API**: No `.build()` methods, tools return directly
- **Type Safety**: Full TypeScript support with Zod validation
- **Client Optimization**: Optional client-side execution with caching
- **Server Integration**: Works seamlessly with Next.js server actions
- **Middleware Support**: Add authentication, logging, rate limiting
- **React Integration**: Built-in hooks and providers for React components

## API Methods

### Core Methods
- `.tool(name)` - Create a new tool
- `.input(schema)` - Define input validation with Zod
- `.execute(handler)` - Server-side execution logic
- `.render(component)` - React component for rendering results

### Optional Methods
- `.clientExecute(handler)` - Client-side execution with caching
- `.middleware(fn)` - Add middleware for auth, logging, etc.
- `.describe(text)` - Add description for documentation
- `.tag(...tags)` - Add tags for organization

## Examples

See `/lib/aui/examples/` for complete examples including:
- Weather tool (simple)
- Search tool (with caching)
- Calculator tool (with validation)
- Form tool (with middleware)
- Analytics tool (complex visualization)

## Testing

```bash
npm test -- lib/aui/__tests__/aui.test.ts
```

All 18 tests passing ✓