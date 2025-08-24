# Lantos AUI Ultra - Ultra-Concise API for AI-Controlled Operations

## Overview

Lantos AUI Ultra provides the most concise API for creating AI-controlled tools in Next.js/Vercel applications. Just chain methods without any build steps.

## Quick Start

```tsx
import aui, { z } from '@/lib/aui/lantos-ultra';

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
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);
```

## Core API

### Creating Tools

```tsx
// Minimal tool
aui.tool('name').execute(handler)

// With input validation
aui.tool('name').input(schema).execute(handler)

// With rendering
aui.tool('name').input(schema).execute(handler).render(component)

// With client optimization
aui.tool('name')
  .input(schema)
  .execute(serverHandler)
  .clientExecute(clientHandler)
  .render(component)
```

### Executing Tools

```tsx
// Direct execution
const result = await tool.run(input, context);

// Execute by name
const result = await aui.execute('toolName', input, context);

// With custom context
const ctx = aui.createContext({ user: currentUser });
const result = await aui.execute('toolName', input, ctx);
```

### Context

```tsx
interface AUIContext {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
}

// Create context
const ctx = aui.createContext({
  user: { id: 1, name: 'Alice' },
  session: { token: 'abc123' }
});
```

## Examples

### Weather Tool (Simple)
```tsx
const weather = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    const temp = await fetchWeatherAPI(input.city);
    return { temp, city: input.city };
  })
  .render(({ data }) => (
    <div className="weather-card">
      <h3>{data.city}</h3>
      <p>{data.temp}°F</p>
    </div>
  ));
```

### Search Tool (With Caching)
```tsx
const search = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    return await database.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    // Fetch and cache
    const result = await ctx.fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: input.query })
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <SearchResults results={data} />
  ));
```

### Calculator Tool
```tsx
const calc = aui
  .tool('calculator')
  .input(z.object({
    a: z.number(),
    b: z.number(),
    op: z.enum(['add', 'subtract', 'multiply', 'divide'])
  }))
  .execute(({ input }) => {
    const ops = {
      add: (a, b) => a + b,
      subtract: (a, b) => a - b,
      multiply: (a, b) => a * b,
      divide: (a, b) => b !== 0 ? a / b : NaN
    };
    return { 
      result: ops[input.op](input.a, input.b),
      expression: `${input.a} ${input.op} ${input.b}`
    };
  })
  .render(({ data }) => (
    <div>{data.expression} = {data.result}</div>
  ));
```

## Tool Registry

```tsx
// List all tools
const tools = aui.list();

// Get specific tool
const tool = aui.get('weather');

// Check if tool exists
if (aui.has('weather')) {
  // Tool exists
}

// Clear all tools
aui.clear();
```

## React Integration

```tsx
function MyComponent() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const executeTool = async () => {
    setLoading(true);
    try {
      const ctx = aui.createContext();
      const data = await aui.execute('weather', { city: 'NYC' }, ctx);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <button onClick={executeTool}>Get Weather</button>
      {loading && <p>Loading...</p>}
      {result && weatherTool.renderer?.({ data: result })}
    </div>
  );
}
```

## AI Agent Integration

Tools can be controlled by AI agents:

```tsx
// AI agent can discover available tools
const tools = aui.list().map(tool => ({
  name: tool.name,
  schema: tool.schema
}));

// AI agent executes tool
const result = await aui.execute(
  aiSelectedTool,
  aiGeneratedInput,
  context
);
```

## Key Features

- **Ultra-concise**: Chain methods without `.build()` calls
- **Type-safe**: Full TypeScript and Zod support
- **Client optimization**: Optional `clientExecute` for caching
- **AI-ready**: Tools discoverable and executable by AI
- **Flexible rendering**: Optional React component rendering
- **Context-aware**: Pass user, session, and cache data

## Best Practices

1. **Keep tools focused**: Each tool should do one thing well
2. **Use Zod schemas**: Always validate inputs with Zod
3. **Cache appropriately**: Use `clientExecute` for expensive operations
4. **Handle errors**: Tools should handle and report errors gracefully
5. **Document schemas**: Make schemas self-documenting for AI agents

## Demo

Run the demo page:
```bash
npm run dev
# Visit http://localhost:3000/lantos-ultra-demo
```

## Testing

```bash
npm test -- lib/aui/__tests__/lantos-ultra.test.ts
```