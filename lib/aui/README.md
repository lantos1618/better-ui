# AUI (Assistant-UI) System

A concise and elegant API for creating AI-controllable tools that work seamlessly across frontend and backend in Next.js applications.

## Quick Start

```tsx
import aui, { z } from '@/lib/aui';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Use the tool
const result = await weatherTool.run({ city: 'Tokyo' });
```

## Core Concepts

### 1. Tool Creation
Tools are created using a fluent API with these key methods:

- `.tool(name)` - Create a new tool with a unique name
- `.input(schema)` - Define input validation using Zod
- `.execute(handler)` - Server-side execution logic
- `.clientExecute(handler)` - Optional client-side optimization
- `.render(component)` - React component for rendering results

### 2. Execution Modes

#### Server Execution (Default)
```tsx
const tool = aui
  .tool('dbQuery')
  .execute(async ({ input }) => {
    return await db.query(input.sql);
  });
```

#### Client Execution (Optimized)
```tsx
const tool = aui
  .tool('search')
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    // Fetch from API
    const result = await ctx.fetch('/api/search', { body: input });
    ctx.cache.set(input.query, result);
    return result;
  });
```

### 3. Context System

The context provides shared resources for tool execution:

```tsx
interface AUIContext {
  cache: Map<string, any>;      // Local cache storage
  fetch: typeof fetch;           // Fetch API
  user?: any;                    // User information
  session?: any;                 // Session data
  env?: Record<string, string>;  // Environment variables
}

// Create context with custom data
const ctx = aui.createContext({
  user: { id: '123', name: 'Alice' },
  session: { token: 'abc' }
});

// Execute tool with context
const result = await tool.run(input, ctx);
```

## API Reference

### AUI Class

```tsx
class AUI {
  tool(name: string): AUITool
  get(name: string): AUITool | undefined
  execute(name: string, input: any, ctx?: AUIContext): Promise<any>
  createContext(additions?: Partial<AUIContext>): AUIContext
  list(): AUITool[]
  getToolNames(): string[]
  has(name: string): boolean
  remove(name: string): boolean
  clear(): void
}
```

### AUITool Class

```tsx
class AUITool<TInput, TOutput> {
  input<T>(schema: ZodType<T>): AUITool<T, TOutput>
  execute<O>(handler: ExecuteHandler<TInput, O>): AUITool<TInput, O>
  clientExecute(handler: ClientHandler<TInput, TOutput>): this
  render(component: RenderComponent<TOutput, TInput>): this
  run(input: TInput, ctx?: AUIContext): Promise<TOutput>
  
  // Properties
  name: string
  schema: ZodType<TInput> | undefined
  renderer: RenderComponent | undefined
}
```

## Examples

### Weather Tool (Simple)
```tsx
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({
    temp: Math.floor(60 + Math.random() * 30),
    city: input.city,
    conditions: 'sunny'
  }))
  .render(({ data }) => (
    <div className="weather-card">
      <h3>{data.city}</h3>
      <p>{data.temp}°F - {data.conditions}</p>
    </div>
  ));
```

### Search Tool (With Caching)
```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    return await database.search(input.query, input.limit);
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) return cached;
    
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const results = await response.json();
    ctx.cache.set(cacheKey, results);
    return results;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Searching...</div>;
    if (error) return <div>Error: {error.message}</div>;
    
    return (
      <div className="search-results">
        {data.map(result => (
          <div key={result.id}>{result.title}</div>
        ))}
      </div>
    );
  });
```

### Calculator Tool (Pure Function)
```tsx
const calculatorTool = aui
  .tool('calculator')
  .input(z.object({
    expression: z.string(),
    precision: z.number().optional().default(2)
  }))
  .execute(({ input }) => {
    const result = evaluate(input.expression);
    return {
      expression: input.expression,
      result: Number(result.toFixed(input.precision))
    };
  })
  .render(({ data }) => (
    <div className="calculator-display">
      {data.expression} = {data.result}
    </div>
  ));
```

### Form Tool (With Optimistic Updates)
```tsx
const formTool = aui
  .tool('form')
  .input(z.object({
    action: z.enum(['submit', 'validate', 'save']),
    formData: z.record(z.any())
  }))
  .execute(async ({ input }) => {
    switch (input.action) {
      case 'submit':
        return await api.submitForm(input.formData);
      case 'validate':
        return validateForm(input.formData);
      case 'save':
        return await api.saveDraft(input.formData);
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Optimistic update for save action
    if (input.action === 'save') {
      ctx.cache.set('draft', input.formData);
      return { saved: true, cached: true };
    }
    
    // Server call for submit
    return await ctx.fetch('/api/tools/form', {
      method: 'POST',
      body: JSON.stringify(input)
    }).then(r => r.json());
  })
  .render(({ data }) => (
    <div className="form-status">
      {data.saved && <p>✓ Saved</p>}
      {data.submitted && <p>✓ Submitted: {data.id}</p>}
    </div>
  ));
```

## React Hooks

### useAUITool Hook

```tsx
import { useAUITool } from '@/lib/aui/hooks/useAUITool';

function MyComponent() {
  const { data, loading, error, execute } = useAUITool(weatherTool, {
    cache: true,
    cacheTime: 60000, // 1 minute
    onSuccess: (data) => console.log('Success:', data),
    onError: (error) => console.error('Error:', error)
  });

  const handleClick = () => {
    execute({ city: 'Tokyo' });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <button onClick={handleClick}>Get Weather</button>;

  return weatherTool.renderer?.({ data });
}
```

### useAUI Hook (Dynamic Tools)

```tsx
import { useAUI } from '@/lib/aui/hooks/useAUITool';

function DynamicToolUser() {
  const { execute, loading, data, errors } = useAUI();

  const runTool = async (toolName: string, input: any) => {
    try {
      const result = await execute(toolName, input);
      console.log('Tool result:', result);
    } catch (error) {
      console.error('Tool failed:', error);
    }
  };

  return (
    <div>
      <button onClick={() => runTool('weather', { city: 'Tokyo' })}>
        Run Weather Tool
      </button>
      {loading.weather && <div>Loading weather...</div>}
      {data.weather && <div>Weather data: {JSON.stringify(data.weather)}</div>}
      {errors.weather && <div>Error: {errors.weather.message}</div>}
    </div>
  );
}
```

## Server Integration

### API Route Handler

```tsx
// app/api/aui/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

// Register your tools
import '@/lib/aui/tools';

export async function POST(request: NextRequest) {
  const { tool: toolName, input } = await request.json();
  
  const tool = aui.get(toolName);
  if (!tool) {
    return NextResponse.json(
      { error: `Tool "${toolName}" not found` },
      { status: 404 }
    );
  }

  try {
    const ctx = aui.createContext({
      user: await getUserFromSession(request),
      env: process.env
    });
    
    const data = await tool.run(input, ctx);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

## Testing

```tsx
import aui, { z } from '@/lib/aui';

describe('My Tool', () => {
  it('should execute correctly', async () => {
    const tool = aui
      .tool('test')
      .input(z.object({ value: z.number() }))
      .execute(async ({ input }) => input.value * 2);

    const result = await tool.run({ value: 5 });
    expect(result).toBe(10);
  });

  it('should validate input', async () => {
    const tool = aui
      .tool('strict')
      .input(z.object({ required: z.string() }))
      .execute(async ({ input }) => input.required);

    await expect(tool.run({})).rejects.toThrow();
  });

  it('should use client execution with context', async () => {
    const tool = aui
      .tool('cached')
      .clientExecute(async ({ input, ctx }) => {
        ctx.cache.set('key', input);
        return ctx.cache.get('key');
      });

    const ctx = aui.createContext();
    const result = await tool.run('value', ctx);
    expect(result).toBe('value');
    expect(ctx.cache.get('key')).toBe('value');
  });
});
```

## Best Practices

1. **Keep Tools Focused**: Each tool should do one thing well
2. **Use Input Validation**: Always define schemas with Zod for type safety
3. **Optimize with Client Execution**: Use clientExecute for caching and offline support
4. **Provide Rich Rendering**: Include render methods for better UX
5. **Handle Errors Gracefully**: Use try-catch in execute handlers
6. **Cache Strategically**: Use context cache for expensive operations
7. **Test Thoroughly**: Write tests for both server and client execution paths

## TypeScript Support

AUI is fully typed with TypeScript. Input and output types are automatically inferred:

```tsx
const typedTool = aui
  .tool('typed')
  .input(z.object({ 
    name: z.string(),
    age: z.number() 
  }))
  .execute(async ({ input }) => ({
    message: `${input.name} is ${input.age} years old`,
    isAdult: input.age >= 18
  }));

// Types are automatically inferred
type ToolInput = InferToolInput<typeof typedTool>;   // { name: string; age: number }
type ToolOutput = InferToolOutput<typeof typedTool>; // { message: string; isAdult: boolean }
```

## License

MIT