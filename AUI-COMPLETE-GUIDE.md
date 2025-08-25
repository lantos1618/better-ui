# AUI (Assistant-UI) Complete Guide

AUI is a concise, powerful system for creating AI-controllable tools in Next.js/Vercel applications. It enables seamless frontend and backend control through a simple, chainable API.

## Core Philosophy

- **Concise**: No `.build()` methods, just chain and use
- **Powerful**: Full client/server execution with caching and optimization
- **AI-Ready**: Designed for AI agents to control your application
- **Type-Safe**: Full TypeScript and Zod integration
- **Flexible**: Works with any Next.js or React application

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

// Use it
const result = await simpleTool.run({ city: 'NYC' });
```

## API Methods

### Core Methods (Required)

#### `.tool(name: string)`
Creates a new tool instance.

#### `.input(schema: ZodSchema)`
Defines and validates input structure.

#### `.execute(handler: Function)`
Server-side execution logic.

### Optional Methods

#### `.clientExecute(handler: Function)`
Client-side optimization with caching.

#### `.render(component: Function)`
React component for UI rendering.

#### `.middleware(fn: Function)`
Add processing middleware.

#### `.describe(text: string)`
Add tool description for AI agents.

#### `.tag(...tags: string[])`
Categorize tools for discovery.

## Tool Patterns

### 1. Simple Tool Pattern
Best for: Basic operations without optimization needs

```tsx
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <WeatherCard {...data} />);
```

### 2. Cached Tool Pattern
Best for: Expensive operations that benefit from caching

```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/search', { body: input });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => <SearchResults items={data} />);
```

### 3. Frontend Control Pattern
Best for: UI manipulation and DOM control

```tsx
const uiTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'toggle']),
    selector: z.string()
  }))
  .execute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    // Manipulate DOM
    return { success: true };
  });
```

### 4. Backend Control Pattern
Best for: Database operations and server-side logic

```tsx
const dbTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any()
  }))
  .execute(async ({ input }) => {
    // Database operations
    return await db[input.operation](input.table, input.data);
  });
```

## Context Object

The context (`ctx`) provides:

```tsx
interface AUIContext {
  cache: Map<string, any>;        // Client-side cache
  fetch: typeof fetch;             // Fetch function
  user?: any;                      // User data
  session?: any;                   // Session data
  env?: Record<string, string>;    // Environment variables
  headers?: HeadersInit;           // Request headers
  cookies?: Record<string, string>; // Cookies
  isServer?: boolean;              // Server/client detection
}
```

## AI Agent Integration

Tools are designed for AI agents to discover and use:

```tsx
// AI agent can list all tools
const tools = aui.list();

// AI agent can find tools by tag
const uiTools = aui.findByTag('ui');
const dataTools = aui.findByTag('database');

// AI agent can execute tools
const result = await aui.execute('search', { query: 'AI tools' });
```

## Best Practices

### 1. Input Validation
Always use Zod schemas for type safety:

```tsx
.input(z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120)
}))
```

### 2. Error Handling
Tools automatically handle errors, but you can add custom handling:

```tsx
.execute(async ({ input }) => {
  try {
    return await riskyOperation(input);
  } catch (error) {
    return { error: error.message };
  }
})
```

### 3. Caching Strategy
Use client execution for frequently accessed data:

```tsx
.clientExecute(async ({ input, ctx }) => {
  const key = JSON.stringify(input);
  const cached = ctx.cache.get(key);
  
  if (cached && Date.now() - cached.time < 60000) { // 1 minute TTL
    return cached.data;
  }
  
  const fresh = await ctx.fetch('/api/data', { body: input });
  ctx.cache.set(key, { data: fresh, time: Date.now() });
  return fresh;
})
```

### 4. Middleware for Cross-Cutting Concerns

```tsx
.middleware(async ({ input, ctx, next }) => {
  console.log('Before:', input);
  const result = await next();
  console.log('After:', result);
  return result;
})
```

## Advanced Features

### Tool Composition

```tsx
const composedTool = aui
  .tool('composed')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => {
    // Use other tools
    const user = await dbTool.run({ 
      operation: 'read', 
      table: 'users', 
      id: input.userId 
    });
    const weather = await weatherTool.run({ 
      city: user.city 
    });
    return { user, weather };
  });
```

### Dynamic Tool Creation

```tsx
function createCrudTool(tableName: string) {
  return aui
    .tool(`${tableName}-crud`)
    .input(z.object({
      operation: z.enum(['create', 'read', 'update', 'delete']),
      data: z.any()
    }))
    .execute(async ({ input }) => {
      return await db[input.operation](tableName, input.data);
    });
}

const usersTool = createCrudTool('users');
const postsTool = createCrudTool('posts');
```

## Testing

```tsx
import { describe, it, expect } from '@jest/globals';

describe('AUI Tools', () => {
  it('should execute weather tool', async () => {
    const result = await weatherTool.run({ city: 'NYC' });
    expect(result).toHaveProperty('temp');
    expect(result.city).toBe('NYC');
  });
  
  it('should cache search results', async () => {
    const ctx = { cache: new Map(), fetch: jest.fn() };
    const tool = searchTool.clientExecute;
    
    await tool({ input: { query: 'test' }, ctx });
    await tool({ input: { query: 'test' }, ctx });
    
    expect(ctx.fetch).toHaveBeenCalledTimes(1);
  });
});
```

## Migration from Other Systems

### From tRPC

```tsx
// Before (tRPC)
const weatherQuery = trpc.weather.useQuery({ city: 'NYC' });

// After (AUI)
const weather = await weatherTool.run({ city: 'NYC' });
```

### From Server Actions

```tsx
// Before (Server Action)
async function getWeather(city: string) {
  'use server';
  return { temp: 72, city };
}

// After (AUI)
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }));
```

## Performance Tips

1. **Use clientExecute for read-heavy operations**
2. **Implement cache TTL for time-sensitive data**
3. **Batch operations when possible**
4. **Use middleware for logging/monitoring**
5. **Leverage tags for tool discovery**

## Security Considerations

1. **Always validate inputs with Zod**
2. **Sanitize user data before DOM manipulation**
3. **Use context for authentication/authorization**
4. **Implement rate limiting in middleware**
5. **Validate AI agent permissions**

## Complete Example

```tsx
// Define tools
const tools = {
  weather: aui
    .tool('weather')
    .describe('Get weather for a city')
    .tag('data', 'external')
    .input(z.object({ city: z.string() }))
    .execute(async ({ input }) => ({ temp: 72, city: input.city }))
    .render(({ data }) => <WeatherWidget {...data} />),
    
  user: aui
    .tool('user')
    .describe('User management')
    .tag('database', 'auth')
    .input(z.object({ 
      action: z.enum(['create', 'update']),
      data: z.object({ name: z.string(), email: z.string().email() })
    }))
    .middleware(async ({ input, ctx, next }) => {
      if (!ctx.user?.isAdmin) throw new Error('Unauthorized');
      return next();
    })
    .execute(async ({ input }) => {
      return await db.users[input.action](input.data);
    })
};

// AI Agent can use tools
async function aiAgent(prompt: string) {
  if (prompt.includes('weather')) {
    return await tools.weather.run({ city: 'NYC' });
  }
  if (prompt.includes('user')) {
    return await tools.user.run({ 
      action: 'create',
      data: { name: 'John', email: 'john@example.com' }
    });
  }
}
```

## Conclusion

AUI provides a clean, powerful API for building AI-controllable tools in Next.js applications. Its concise syntax and flexible architecture make it ideal for modern AI-powered applications.