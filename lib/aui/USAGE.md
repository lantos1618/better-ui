# AUI (Assistant-UI) System

A clean, concise tool system for AI-controlled frontend and backend operations in Next.js/Vercel.

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

## Core API

### Creating Tools

```tsx
const tool = aui
  .tool('tool-name')           // Create tool with unique name
  .input(schema)                // Define input schema with Zod
  .execute(handler)             // Server/default execution
  .clientExecute(handler)       // Optional: client-side execution
  .render(component)            // Optional: React component for results
  .middleware(handler)          // Optional: middleware for auth, logging
  .describe('description')      // Optional: tool description
  .tag('category', 'type');     // Optional: tags for organization
```

### Using Tools in Components

```tsx
import { useAUITool } from '@/lib/aui/hooks/useAUITool';

function MyComponent() {
  const { execute, data, loading, error } = useAUITool(myTool);
  
  const handleAction = async () => {
    const result = await execute({ input: 'value' });
    console.log(result);
  };
  
  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && myTool.renderer && myTool.renderer({ data })}
    </div>
  );
}
```

### Context Object

The context object provides access to:
- `cache`: Map for caching data
- `fetch`: Fetch function for API calls
- `user`: Current user object
- `session`: Session data
- `env`: Environment variables
- `headers`: Request headers
- `cookies`: Request cookies
- `isServer`: Boolean indicating server/client environment

## Examples

### 1. Weather Tool (Simple)
```tsx
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    const response = await fetch(`/api/weather?city=${input.city}`);
    return response.json();
  })
  .render(({ data }) => (
    <div className="weather-card">
      <h3>{data.city}</h3>
      <p>{data.temp}°C</p>
    </div>
  ));
```

### 2. Database Search (With Caching)
```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional() 
  }))
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = JSON.stringify(input);
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data }) => <SearchResults items={data} />);
```

### 3. Protected Action (With Middleware)
```tsx
const adminTool = aui
  .tool('admin-action')
  .input(z.object({ action: z.string() }))
  .middleware(async ({ input, ctx, next }) => {
    if (!ctx?.user?.isAdmin) {
      throw new Error('Admin access required');
    }
    console.log(`Admin ${ctx.user.id} performing ${input.action}`);
    return next();
  })
  .execute(async ({ input }) => {
    // Perform admin action
    return { success: true, action: input.action };
  });
```

### 4. File Upload (Client Processing)
```tsx
const uploadTool = aui
  .tool('upload')
  .input(z.object({ 
    file: z.instanceof(File),
    processLocally: z.boolean() 
  }))
  .clientExecute(async ({ input, ctx }) => {
    if (input.processLocally && input.file.size < 5000000) {
      // Process small files locally
      const text = await input.file.text();
      return { content: text, processedLocally: true };
    }
    
    // Large files go to server
    const formData = new FormData();
    formData.append('file', input.file);
    return ctx.fetch('/api/upload', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
  });
```

## Server Actions

For server-only operations:

```tsx
// Server tool (runs only on server)
const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any()
  }))
  .execute(async ({ input }) => {
    // Direct database access
    const db = await getDatabase();
    return db[input.operation](input.table, input.data);
  });

// API route handler
export async function POST(request: NextRequest) {
  const { tool, input } = await request.json();
  const result = await aui.execute(tool, input, {
    isServer: true,
    headers: request.headers,
    // ... other context
  });
  return NextResponse.json(result);
}
```

## Best Practices

1. **Use simple tools by default** - Only add `clientExecute` when you need caching or offline support
2. **Validate inputs with Zod** - Always define input schemas for type safety
3. **Add middleware for cross-cutting concerns** - Authentication, logging, rate limiting
4. **Keep execute handlers focused** - One tool, one responsibility
5. **Use context for environment data** - Don't hardcode URLs or credentials
6. **Render components are optional** - Tools can return data without UI

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│   AUI Tool   │────▶│   Server    │
│  Component  │     │              │     │   Handler   │
└─────────────┘     │ - input()    │     └─────────────┘
                    │ - execute()  │              │
                    │ - render()   │              ▼
                    └──────────────┘     ┌─────────────┐
                            │            │   Database  │
                            ▼            └─────────────┘
                    ┌──────────────┐
                    │   UI Render  │
                    └──────────────┘
```

## Advanced Features

### Middleware Chain
```tsx
tool
  .middleware(logging)
  .middleware(authentication)
  .middleware(rateLimit)
  .execute(handler);
```

### Batch Operations
```tsx
const results = await Promise.all([
  aui.execute('tool1', input1),
  aui.execute('tool2', input2),
  aui.execute('tool3', input3)
]);
```

### Tool Registry
```tsx
// List all tools
const tools = aui.getTools();

// Find by tag
const adminTools = aui.findByTag('admin');

// Check existence
if (aui.has('my-tool')) {
  // Use tool
}
```

## TypeScript Support

Full type inference:

```tsx
// Input and output types are inferred
const tool = aui
  .tool('typed')
  .input(z.object({ 
    name: z.string(),
    age: z.number() 
  }))
  .execute(async ({ input }) => ({
    message: `Hello ${input.name}, age ${input.age}`
  }));

// TypeScript knows the types
type Input = InferToolInput<typeof tool>;   // { name: string, age: number }
type Output = InferToolOutput<typeof tool>;  // { message: string }
```

## Testing

```tsx
import { renderHook } from '@testing-library/react-hooks';
import { useAUITool } from '@/lib/aui';

test('tool execution', async () => {
  const { result } = renderHook(() => useAUITool(myTool));
  
  await act(async () => {
    await result.current.execute({ input: 'test' });
  });
  
  expect(result.current.data).toEqual(expectedOutput);
});
```

## Migration Guide

From other tool systems:

```tsx
// Before (verbose)
const tool = new ToolBuilder()
  .setName('weather')
  .setInput(schema)
  .setExecute(handler)
  .setRender(component)
  .build();

// After (concise)
const tool = aui
  .tool('weather')
  .input(schema)
  .execute(handler)
  .render(component);
```

## License

MIT