# AUI (Assistant-UI) System

A concise and elegant API for creating AI-controlled tools that can execute on both frontend and backend in Next.js/Vercel applications.

## Core Philosophy

AUI follows a simple, chainable API pattern without any build steps. Tools are immediately usable after definition:

```tsx
const tool = aui
  .tool('name')
  .input(schema)
  .execute(handler)
  .render(component)
```

## API Patterns

### Simple Tool (2 methods minimum)

The simplest possible tool only needs `execute` and `render`:

```tsx
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
```

### Complex Tool (with client optimization)

Add `clientExecute` only when you need client-side features like caching, offline support, or optimistic updates:

```tsx
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    // Fetch from server
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
    
    // Cache result
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => <SearchResults results={data} />)
```

## Core Methods

### `.tool(name: string)`
Creates a new tool with the given name. Returns a chainable AUITool instance.

### `.input(schema: ZodType)`
Defines the input schema using Zod. This enables:
- Type safety
- Runtime validation
- Automatic error handling

### `.execute(handler: Function)`
Defines the server-side execution logic. This runs in the API route context and has access to:
- Database connections
- File system
- Environment variables
- Server-only APIs

### `.clientExecute(handler: Function)` (optional)
Defines client-side execution logic. Use this for:
- Caching strategies
- Offline support
- Optimistic updates
- Direct browser API access

### `.render(component: Function)`
Defines how to render the tool's output. Receives props:
- `data`: The execution result
- `input`: The original input (optional)
- `loading`: Loading state (optional)
- `error`: Error object if failed (optional)

## Context Object

The context object (`ctx`) provides utilities for tool execution:

```tsx
interface AUIContext {
  cache: Map<string, any>;      // In-memory cache
  fetch: typeof fetch;           // Fetch function
  user?: any;                    // User data
  session?: any;                 // Session data
  env?: Record<string, string>;  // Environment variables
}
```

## Server Integration

### API Route (`/api/aui/execute`)

```tsx
import aui from '@/lib/aui';

export async function POST(request: NextRequest) {
  const { tool: toolName, input } = await request.json();
  
  const tool = aui.get(toolName);
  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  }

  const data = await tool.run(input);
  return NextResponse.json({ success: true, data });
}
```

## Client Usage

### Direct Execution

```tsx
const tool = aui.get('weather');
const result = await tool.run({ city: 'Tokyo' }, ctx);
```

### With React Hook

```tsx
function MyComponent() {
  const { execute, data, loading, error } = useAUITool('weather');
  
  return (
    <button onClick={() => execute({ city: 'Tokyo' })}>
      Get Weather
    </button>
  );
}
```

## Built-in Tools

AUI comes with several example tools:

- **weather**: Get weather for a city
- **search**: Search with caching
- **calculator**: Basic math operations
- **database**: CRUD operations
- **filesystem**: File operations
- **api**: HTTP requests
- **process**: Command execution
- **state**: State management
- **notification**: User notifications
- **userProfile**: User data with caching

## Type Safety

AUI provides full TypeScript support with type inference:

```tsx
// Infer input and output types
type WeatherInput = InferToolInput<typeof weatherTool>;
type WeatherOutput = InferToolOutput<typeof weatherTool>;
```

## Best Practices

1. **Keep it Simple**: Start with just `execute` and `render`
2. **Add Complexity Gradually**: Only add `clientExecute` when needed
3. **Use Context Wisely**: Leverage the context for caching and state
4. **Type Everything**: Use Zod schemas for robust validation
5. **Handle Errors**: Always handle potential failures gracefully

## Example: Building a Custom Tool

```tsx
// Define a tool for GitHub API
const githubTool = aui
  .tool('github')
  .input(z.object({
    owner: z.string(),
    repo: z.string(),
    endpoint: z.enum(['issues', 'pulls', 'commits'])
  }))
  .execute(async ({ input }) => {
    const response = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repo}/${input.endpoint}`
    );
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    const key = `${input.owner}/${input.repo}/${input.endpoint}`;
    const cached = ctx.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
    
    const data = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'github', input })
    }).then(r => r.json());
    
    ctx.cache.set(key, { data, timestamp: Date.now() });
    return data;
  })
  .render(({ data, loading }) => {
    if (loading) return <div>Loading...</div>;
    
    return (
      <div className="space-y-2">
        {data.map(item => (
          <div key={item.id} className="p-2 border rounded">
            <h3>{item.title || item.message}</h3>
            <p className="text-sm text-gray-600">
              by {item.user?.login || item.author?.name}
            </p>
          </div>
        ))}
      </div>
    );
  });
```

## Architecture Benefits

- **Simplicity**: Clean, minimal API surface
- **Flexibility**: Works in any Next.js environment
- **Performance**: Optional client-side optimization
- **Type Safety**: Full TypeScript and Zod integration
- **AI-Ready**: Designed for LLM tool calling
- **Testable**: Easy to test in isolation

## Migration from Other Systems

If migrating from other tool systems, AUI provides a simpler alternative:

```tsx
// Before (complex systems)
const tool = new ToolBuilder()
  .setName('weather')
  .setSchema(schema)
  .setHandler(handler)
  .setRenderer(renderer)
  .build(); // Extra build step

// After (AUI)
const tool = aui
  .tool('weather')
  .input(schema)
  .execute(handler)
  .render(renderer); // Ready immediately
```

## Summary

AUI provides a concise, powerful way to create AI-controlled tools that can seamlessly operate across your entire Next.js stack. With just 2-4 method calls, you can create sophisticated tools that handle both server and client execution with built-in rendering.