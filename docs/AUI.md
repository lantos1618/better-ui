# AUI (Assistant-UI) System

A concise, powerful tool system for AI control of frontend and backend operations in Next.js/Vercel applications.

## Quick Start

```tsx
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

## Core Concepts

### 1. Tool Creation
Tools are created using the fluent API pattern with method chaining:

```typescript
const tool = aui
  .tool('name')           // Create tool with unique name
  .input(schema)          // Define input validation with Zod
  .execute(handler)       // Server/default execution logic
  .clientExecute(handler) // Optional: Client-side optimization
  .render(component)      // Optional: React component for rendering
```

### 2. Execution Context
Every tool execution receives a context object with useful utilities:

```typescript
interface AUIContext {
  cache: Map<string, any>      // In-memory cache
  fetch: typeof fetch           // Fetch API
  user?: any                    // User info
  session?: any                 // Session data
  env?: Record<string, string>  // Environment variables
  headers?: HeadersInit         // HTTP headers
  cookies?: Record<string, string> // Cookies
  isServer?: boolean           // Server/client indicator
}
```

### 3. Tool Execution
Tools can be executed directly or through the AUI instance:

```typescript
// Direct execution
const result = await tool.run(input, context);

// Through AUI instance
const result = await aui.execute('toolName', input, context);
```

## AI Control Features

### Database Operations
```typescript
const dbTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['find', 'create', 'update', 'delete']),
    collection: z.string(),
    data: z.any()
  }))
  .execute(async ({ input }) => {
    // Perform database operations
    return db[input.operation](input.collection, input.data);
  })
```

### DOM Manipulation
```typescript
const domTool = aui
  .tool('dom')
  .input(z.object({
    selector: z.string(),
    action: z.enum(['click', 'type', 'scroll'])
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    // Perform DOM operations
  })
```

### API Requests
```typescript
const apiTool = aui
  .tool('api')
  .input(z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    return fetch(input.url, {
      method: input.method,
      body: JSON.stringify(input.body)
    }).then(r => r.json());
  })
```

## Server Integration

### API Route Setup
```typescript
// app/api/aui/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

export async function POST(request: NextRequest) {
  const { tool, input } = await request.json();
  const result = await aui.execute(tool, input);
  return NextResponse.json({ data: result });
}
```

### Batch Execution
```typescript
// Execute multiple tools in parallel
const results = await Promise.all([
  weatherTool.run({ city: 'Tokyo' }),
  searchTool.run({ query: 'AI' }),
  dbTool.run({ operation: 'find', collection: 'users' })
]);
```

## Client Components

### Using Tools in React
```tsx
import { useState } from 'react';
import aui from '@/lib/aui';

function MyComponent() {
  const [data, setData] = useState(null);
  
  const handleSearch = async (query: string) => {
    const tool = aui.get('search');
    const result = await tool.run({ query });
    setData(result);
  };
  
  return (
    <div>
      {data && tool.renderer && tool.renderer({ data })}
    </div>
  );
}
```

### With Provider
```tsx
import { AUIProvider, useAUITool } from '@/lib/aui';

function App() {
  return (
    <AUIProvider>
      <SearchComponent />
    </AUIProvider>
  );
}

function SearchComponent() {
  const { execute, loading, data } = useAUITool('search');
  
  return (
    <button onClick={() => execute({ query: 'test' })}>
      Search
    </button>
  );
}
```

## Advanced Features

### Middleware
```typescript
const tool = aui
  .tool('protected')
  .middleware(async ({ input, ctx, next }) => {
    // Authentication check
    if (!ctx.user) throw new Error('Unauthorized');
    return next();
  })
  .execute(async ({ input }) => {
    // Protected operation
  });
```

### Tags and Discovery
```typescript
// Tag tools for organization
const tool = aui
  .tool('analytics')
  .tag('metrics', 'reporting')
  .describe('Track user analytics')
  .execute(handler);

// Find tools by tag
const metricTools = aui.findByTag('metrics');
```

### Type Safety
```typescript
import { InferToolInput, InferToolOutput } from '@/lib/aui';

const tool = aui.tool('typed')
  .input(z.object({ id: z.number() }))
  .execute(async ({ input }) => ({ name: 'User' }));

type Input = InferToolInput<typeof tool>;   // { id: number }
type Output = InferToolOutput<typeof tool>;  // { name: string }
```

## Best Practices

1. **Keep Tools Focused**: Each tool should do one thing well
2. **Use Type Safety**: Always define input schemas with Zod
3. **Optimize with clientExecute**: Add client execution for caching and offline support
4. **Render Components**: Provide render methods for visual feedback
5. **Handle Errors**: Use try-catch blocks and provide meaningful error messages
6. **Context Aware**: Leverage context for caching, authentication, and state

## Examples

### Weather Tool
```typescript
const weatherTool = aui
  .tool('weather')
  .input(z.object({ 
    city: z.string(),
    units: z.enum(['celsius', 'fahrenheit']).optional()
  }))
  .execute(async ({ input }) => {
    const response = await fetch(
      `https://api.weather.com/v1/weather?city=${input.city}`
    );
    return response.json();
  })
  .render(({ data }) => (
    <WeatherCard city={data.city} temp={data.temp} />
  ));
```

### Form Submission
```typescript
const formTool = aui
  .tool('contactForm')
  .input(z.object({
    name: z.string().min(2),
    email: z.string().email(),
    message: z.string().min(10)
  }))
  .execute(async ({ input }) => {
    // Send email
    await sendEmail(input);
    return { success: true };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Show optimistic UI update
    return ctx.fetch('/api/contact', {
      method: 'POST',
      body: JSON.stringify(input)
    }).then(r => r.json());
  });
```

### Database Query
```typescript
const queryTool = aui
  .tool('userQuery')
  .input(z.object({
    filters: z.object({
      role: z.string().optional(),
      active: z.boolean().optional()
    })
  }))
  .execute(async ({ input }) => {
    return db.users.find(input.filters);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = JSON.stringify(input);
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(cacheKey, result);
    return result;
  });
```

## Migration Guide

If you're migrating from a previous tool system:

1. Remove any `.build()` method calls - tools are ready to use immediately
2. Replace tool registries with `aui.tool()` calls
3. Update execution calls to use `.run()` or `aui.execute()`
4. Add type safety with Zod schemas
5. Leverage clientExecute for performance optimization

## API Reference

### AUI Instance Methods
- `tool(name)` - Create a new tool
- `get(name)` - Get existing tool
- `execute(name, input, ctx)` - Execute a tool
- `getTools()` - List all tools
- `findByTag(tag)` - Find tools by tag
- `clear()` - Clear all tools
- `remove(name)` - Remove a specific tool

### Tool Methods
- `input(schema)` - Define input validation
- `execute(handler)` - Set execution handler
- `clientExecute(handler)` - Set client-side handler
- `render(component)` - Set render component
- `middleware(fn)` - Add middleware
- `describe(text)` - Add description
- `tag(...tags)` - Add tags
- `run(input, ctx)` - Execute the tool

## Support

For questions and issues, visit the [GitHub repository](https://github.com/your-repo/aui).