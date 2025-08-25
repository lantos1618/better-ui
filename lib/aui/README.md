# AUI (Assistant-UI) System

A concise and elegant tool system for AI-controlled frontend and backend operations in Next.js/Vercel applications.

## Features

- ✅ **Clean API** - No `.build()` methods, just chainable calls
- ✅ **Type-safe** - Full TypeScript support with Zod validation
- ✅ **Client/Server** - Optimized execution for both environments
- ✅ **AI Control** - Enable AI assistants to control UI and backend
- ✅ **Caching** - Built-in context and caching support
- ✅ **Middleware** - Composable middleware for auth, logging, etc.
- ✅ **React Integration** - Hooks and providers for React apps

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

## Using Tools in React

```tsx
import { useAUITool, AUIProvider } from '@/lib/aui';

function MyComponent() {
  const { execute, data, loading, error } = useAUITool(weatherTool);
  
  return (
    <div>
      <button onClick={() => execute({ city: 'NYC' })}>
        Get Weather
      </button>
      {loading && <div>Loading...</div>}
      {data && weatherTool.renderer({ data })}
    </div>
  );
}

// Wrap your app with AUIProvider
export default function App() {
  return (
    <AUIProvider>
      <MyComponent />
    </AUIProvider>
  );
}
```

## AI Control Example

Enable AI assistants to control both frontend and backend:

```tsx
const databaseTool = aui
  .tool('database')
  .input(z.object({
    table: z.string(),
    operation: z.enum(['select', 'insert', 'update', 'delete']),
    conditions: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Server-side database operations
    return await db[input.operation](input.table, input.conditions);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side optimistic updates
    if (input.operation === 'select') {
      const cached = ctx.cache.get(`${input.table}:${input.operation}`);
      if (cached) return cached;
    }
    return ctx.fetch('/api/database', { body: input });
  });
```

## Testing

```bash
npm test lib/aui/__tests__/aui-tools.test.ts
```

All 22 tests passing ✓ with comprehensive coverage