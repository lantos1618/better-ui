# AUI (Assistant-UI) System

A concise, elegant tool system for AI-controlled frontend and backend operations in Next.js/Vercel applications.

## Quick Start

```tsx
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - with client optimization
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

## Core Concepts

### 1. Tool Creation
Tools are created using the fluent API pattern - no `.build()` method needed:

```tsx
const tool = aui.tool('name')  // Returns immediately usable tool
```

### 2. Input Validation
Use Zod schemas for type-safe input validation:

```tsx
.input(z.object({ 
  field: z.string(),
  count: z.number().min(0)
}))
```

### 3. Execution Modes

#### Server Execution (Default)
```tsx
.execute(async ({ input, ctx }) => {
  // Runs on server with full backend access
  return await database.query(input);
})
```

#### Client Execution (Optional)
```tsx
.clientExecute(async ({ input, ctx }) => {
  // Runs on client for caching, offline support
  return ctx.cache.get(key) || ctx.fetch('/api/...');
})
```

### 4. Rendering
Optional UI rendering for tool results:

```tsx
.render(({ data, loading, error }) => (
  <div>{loading ? 'Loading...' : data}</div>
))
```

## AI Control Patterns

### Frontend Control
```tsx
const uiTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'toggle']),
    selector: z.string()
  }))
  .clientExecute(async ({ input }) => {
    document.querySelector(input.selector).style.display = 
      input.action === 'show' ? 'block' : 'none';
    return { success: true };
  });
```

### Backend Control
```tsx
const dbTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    data: z.any()
  }))
  .execute(async ({ input }) => {
    return await db[input.operation](input.data);
  });
```

## Context & Middleware

### Context Object
```tsx
interface AUIContext {
  cache: Map<string, any>;      // Client-side cache
  fetch: typeof fetch;           // Fetch function
  user?: any;                    // Current user
  session?: any;                 // Session data
  env?: Record<string, string>;  // Environment variables
  headers?: HeadersInit;         // Request headers
  cookies?: Record<string, string>; // Cookies
  isServer?: boolean;            // Execution environment
}
```

### Middleware
```tsx
.middleware(async ({ input, ctx, next }) => {
  // Authentication
  if (!ctx.user) throw new Error('Not authenticated');
  
  // Logging
  console.log('Executing:', input);
  
  // Continue
  return next();
})
```

## React Integration

### Using Hooks
```tsx
import { useAUITool } from '@/lib/aui';

function MyComponent() {
  const { execute, loading, data, error } = useAUITool(weatherTool);
  
  const handleClick = () => {
    execute({ city: 'Tokyo' });
  };
  
  return (
    <div>
      <button onClick={handleClick}>Get Weather</button>
      {loading && <div>Loading...</div>}
      {data && <div>{data.temp}°</div>}
    </div>
  );
}
```

### Provider Setup
```tsx
import { AUIProvider } from '@/lib/aui';

export default function App({ children }) {
  return (
    <AUIProvider>
      {children}
    </AUIProvider>
  );
}
```

## API Routes

### Dynamic Tool Route
```tsx
// app/api/tools/[tool]/route.ts
import { NextRequest } from 'next/server';
import aui from '@/lib/aui';

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  const input = await request.json();
  const result = await aui.execute(params.tool, input);
  return Response.json(result);
}
```

## Tool Discovery

### List Available Tools
```tsx
const tools = aui.list();
tools.forEach(tool => {
  console.log(tool.name, tool.description);
});
```

### Find by Tags
```tsx
const aiTools = aui.findByTag('ai-control');
const dbTools = aui.findByTags('database', 'backend');
```

## Advanced Features

### Tool Chaining
```tsx
const pipeline = aui
  .tool('pipeline')
  .input(z.object({ data: z.any() }))
  .execute(async ({ input }) => {
    const step1 = await tool1.run(input);
    const step2 = await tool2.run(step1);
    return await tool3.run(step2);
  });
```

### Conditional Execution
```tsx
.execute(async ({ input, ctx }) => {
  if (ctx.isServer) {
    return await serverMethod(input);
  } else {
    return await clientMethod(input);
  }
})
```

### Error Handling
```tsx
.execute(async ({ input }) => {
  try {
    return await riskyOperation(input);
  } catch (error) {
    // Graceful degradation
    return { error: error.message, fallback: true };
  }
})
```

## Best Practices

1. **Keep Tools Focused**: Each tool should do one thing well
2. **Use TypeScript**: Leverage type inference for better DX
3. **Cache Wisely**: Use client execution for frequently accessed data
4. **Validate Input**: Always use Zod schemas for input validation
5. **Handle Errors**: Provide meaningful error messages
6. **Document Tools**: Use `.describe()` and `.tag()` for discoverability

## Testing

```tsx
import { AUITool } from '@/lib/aui';

describe('Weather Tool', () => {
  it('should return weather data', async () => {
    const result = await weatherTool.run({ city: 'Paris' });
    expect(result).toHaveProperty('temp');
    expect(result.city).toBe('Paris');
  });
});
```

## Performance Tips

1. **Use Client Execution** for:
   - Cached data
   - UI manipulations
   - Offline support

2. **Use Server Execution** for:
   - Database operations
   - Sensitive operations
   - Heavy computations

3. **Optimize Context**:
   ```tsx
   const ctx = aui.createContext({
     cache: new Map(),
     user: currentUser
   });
   ```

## Migration Guide

### From Traditional API Routes
```tsx
// Before
app.post('/api/weather', async (req, res) => {
  const { city } = req.body;
  const data = await getWeather(city);
  res.json(data);
});

// After
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => getWeather(input.city));
```

### From Redux/Zustand
```tsx
// Before
dispatch(fetchWeather(city));

// After
await weatherTool.run({ city });
```

## Troubleshooting

### Tool Not Found
```tsx
// Check if tool exists
if (aui.has('toolName')) {
  await aui.execute('toolName', input);
}
```

### Input Validation Errors
```tsx
try {
  await tool.run(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log('Validation failed:', error.errors);
  }
}
```

## License

MIT