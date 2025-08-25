# AUI (Assistant-UI) Quickstart Guide

## What is AUI?

AUI is a concise, elegant tool system for Next.js/Vercel that enables AI assistants to control both frontend and backend operations with minimal code.

## Installation

```bash
# Already included in better-ui project
# No additional installation needed
```

## Core Concepts

### 1. Simple Tool Pattern (2 methods minimum)

```tsx
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just input + execute
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({
    temp: 72,
    city: input.city,
    conditions: 'Sunny'
  }));

// Execute the tool
const result = await weatherTool.run({ city: 'NYC' });
```

### 2. Complex Tool with Client Optimization

```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side execution
    return await db.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="search-results">
      {data.map(item => <div key={item.id}>{item.title}</div>)}
    </div>
  ));
```

## Shorthand Methods

```tsx
// Short alias for tool()
aui.t('myTool');

// One-liner for simple tools
aui.do('greet', 
  z.object({ name: z.string() }), 
  async ({ input }) => `Hello ${input.name}!`
);

// Quick tool with all basics
aui.simple('calc', {
  input: z.object({ a: z.number(), b: z.number() }),
  execute: async ({ input }) => input.a + input.b,
  render: ({ data }) => <div>Result: {data}</div>
});

// AI-optimized with retry and cache
aui.ai('process', {
  input: z.object({ data: z.string() }),
  execute: async ({ input }) => processData(input.data),
  retry: 3,
  cache: true
});

// Define multiple tools at once
aui.batch({
  tool1: { execute: async () => 'one' },
  tool2: { execute: async () => 'two' }
});
```

## React Integration

### Using Hooks

```tsx
'use client';

import { useTool } from '@/lib/aui/client';

function WeatherComponent() {
  const { execute, loading, data, error } = useTool(weatherTool);
  
  return (
    <div>
      <button onClick={() => execute({ city: 'NYC' })}>
        Get Weather
      </button>
      
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && (
        <div>
          <h3>{data.city}</h3>
          <p>{data.temp}°F - {data.conditions}</p>
        </div>
      )}
    </div>
  );
}
```

### Using Provider

```tsx
import { AUIProvider, ToolRenderer } from '@/lib/aui/client';

function App() {
  return (
    <AUIProvider>
      <ToolRenderer 
        tool={weatherTool}
        input={{ city: 'NYC' }}
        autoExecute={true}
      />
    </AUIProvider>
  );
}
```

## AI Control Patterns

### Frontend Control

```tsx
const uiControlTool = aui
  .tool('updateUI')
  .input(z.object({
    component: z.string(),
    props: z.record(z.any())
  }))
  .execute(async ({ input }) => {
    // AI can update UI components
    return updateComponent(input.component, input.props);
  })
  .render(({ data }) => <UIPreview {...data} />);
```

### Backend Control

```tsx
const dbTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any()
  }))
  .execute(async ({ input }) => {
    // AI can perform database operations
    switch (input.operation) {
      case 'create':
        return await db.insert(input.table, input.data);
      case 'read':
        return await db.query(input.table, input.data);
      case 'update':
        return await db.update(input.table, input.data);
      case 'delete':
        return await db.delete(input.table, input.data);
    }
  });
```

## Server-Side Usage

```tsx
// app/api/aui/execute/route.ts
import { executeServerTool } from '@/lib/aui/server';

export async function POST(request: Request) {
  const { toolName, input } = await request.json();
  
  const result = await executeServerTool(toolName, input);
  
  return Response.json(result);
}
```

## Context Management

```tsx
// Set global context for all tools
aui.setContext({
  user: { id: '123', name: 'John' },
  session: { token: 'abc123' }
});

// Tools can access context
const profileTool = aui
  .tool('profile')
  .execute(async ({ ctx }) => {
    return {
      user: ctx?.user,
      session: ctx?.session
    };
  });
```

## Advanced Features

### Retry Logic

```tsx
const flakeyTool = aui
  .tool('flakeyAPI')
  .input(z.object({ endpoint: z.string() }))
  .execute(async ({ input }) => fetch(input.endpoint))
  .retry(3); // Retry up to 3 times
```

### Caching

```tsx
const expensiveTool = aui
  .tool('expensive')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => expensiveOperation(input))
  .cache(60000); // Cache for 60 seconds
```

### Timeout

```tsx
const slowTool = aui
  .tool('slow')
  .execute(async () => longRunningTask())
  .timeout(5000); // Timeout after 5 seconds
```

## Complete Example

```tsx
// Define tools
const tools = {
  weather: aui
    .tool('weather')
    .input(z.object({ city: z.string() }))
    .execute(async ({ input }) => ({
      temp: Math.round(Math.random() * 30 + 60),
      city: input.city,
      conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
    }))
    .render(({ data }) => (
      <div className="weather-card">
        <h3>{data.city}</h3>
        <p>{data.temp}°F</p>
        <p>{data.conditions}</p>
      </div>
    )),
    
  search: aui
    .tool('search')
    .input(z.object({ query: z.string() }))
    .execute(async ({ input }) => {
      // Simulated search
      return [
        { id: 1, title: `Result for ${input.query}` },
        { id: 2, title: `Another result for ${input.query}` }
      ];
    })
    .clientExecute(async ({ input, ctx }) => {
      const cached = ctx.cache.get(input.query);
      if (cached) return cached;
      
      const result = await ctx.fetch('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: input.query })
      });
      
      ctx.cache.set(input.query, result);
      return result;
    })
    .render(({ data }) => (
      <div className="search-results">
        {data.map(item => (
          <div key={item.id} className="result-item">
            {item.title}
          </div>
        ))}
      </div>
    ))
};

// Use in component
function MyApp() {
  const weather = useTool(tools.weather);
  const search = useTool(tools.search, { debounce: 500 });
  
  return (
    <div>
      <h1>AUI Demo</h1>
      
      <section>
        <h2>Weather</h2>
        <button onClick={() => weather.execute({ city: 'NYC' })}>
          Get NYC Weather
        </button>
        {weather.data && tools.weather.renderResult(weather.data)}
      </section>
      
      <section>
        <h2>Search</h2>
        <input
          type="text"
          onChange={(e) => search.execute({ query: e.target.value })}
          placeholder="Search..."
        />
        {search.data && tools.search.renderResult(search.data)}
      </section>
    </div>
  );
}
```

## Best Practices

1. **Keep tools focused** - Each tool should do one thing well
2. **Use TypeScript** - Leverage Zod schemas for type safety
3. **Cache expensive operations** - Use the built-in cache system
4. **Handle errors gracefully** - Use retry logic for flaky operations
5. **Optimize for client/server** - Use clientExecute for client-side optimization
6. **Document tool inputs** - Clear schemas help AI understand tool usage

## Testing

```tsx
import { describe, it, expect } from '@jest/globals';

describe('Weather Tool', () => {
  it('should return weather data', async () => {
    const result = await weatherTool.run({ city: 'NYC' });
    
    expect(result).toHaveProperty('temp');
    expect(result).toHaveProperty('city', 'NYC');
    expect(result).toHaveProperty('conditions');
  });
});
```

## Troubleshooting

### Tool not found
```tsx
// Make sure tool is registered
const tool = aui.get('myTool');
if (!tool) {
  console.error('Tool not found');
}
```

### Context not available
```tsx
// Ensure context is set before execution
aui.setContext({ user: currentUser });
```

### Client/Server mismatch
```tsx
// Use appropriate execution based on environment
const isClient = typeof window !== 'undefined';
if (isClient) {
  // Client-specific logic
}
```

## Next Steps

1. Explore the [examples directory](/examples/aui-patterns.tsx)
2. Check out the [showcase page](/app/aui/page.tsx)
3. Read the [full documentation](/lib/aui/README.md)
4. Try the [interactive demo](/app/aui/page.tsx)

## Summary

AUI provides a powerful yet concise API for building AI-controllable tools in Next.js applications. With just 2 methods minimum for simple tools and comprehensive features for complex scenarios, it strikes the perfect balance between simplicity and capability.