# AUI - Assistant UI (Lantos Branch)

Ultra-concise API for AI-controlled frontend and backend operations in Next.js/Vercel.

## Quick Start

```tsx
import { aui, z } from '@/lib/aui';

// Simple tool - just 2 methods
const weather = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .build();

// Complex tool - adds client optimization
const search = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();
```

## Ultra-Concise Patterns

### 1. One-liner with `aui.do()`
```tsx
aui.do('echo', (input: { msg: string }) => ({ echo: input.msg }));
```

### 2. Quick mode (auto-build)
```tsx
aui.quick('time').execute(() => ({ time: Date.now() }));
```

### 3. Simple tool helper
```tsx
aui.simple('random', 
  z.object({ min: z.number(), max: z.number() }),
  ({ min, max }) => ({ value: Math.random() * (max - min) + min })
);
```

### 4. AI-optimized with retries
```tsx
aui.ai('smartQuery', {
  input: z.object({ q: z.string() }),
  execute: async ({ q }) => ({ results: await search(q) }),
  retry: 3,
  cache: true
});
```

### 5. Batch definition
```tsx
const tools = aui.defineTools({
  add: {
    input: z.object({ a: z.number(), b: z.number() }),
    execute: ({ a, b }) => ({ sum: a + b })
  },
  multiply: {
    input: z.object({ a: z.number(), b: z.number() }),
    execute: ({ a, b }) => ({ product: a * b })
  }
});
```

## AI Control Capabilities

### Frontend Control
- DOM manipulation
- Event triggering
- Style updates
- Component state management

### Backend Control
- Process management
- Database operations
- File system access
- API orchestration

### Client Optimization
- Request caching
- Offline support
- Optimistic updates
- Retry logic

## Tool Anatomy

```tsx
aui
  .tool('name')              // Required: tool identifier
  .input(schema)             // Required: Zod schema
  .execute(handler)          // Required: server execution
  .clientExecute(handler)    // Optional: client optimization
  .render(component)         // Optional: UI rendering
  .middleware(fn)            // Optional: request processing
  .build();                  // Required: finalize tool
```

## Context API

Tools receive a context object with:
- `cache`: Client-side cache
- `fetch`: Enhanced fetch with auth
- `state`: Shared state management
- `emit`: Event emission
- `user`: Current user info

## Best Practices

1. **Start simple**: Use minimal API first
2. **Add complexity only when needed**: Client execution, caching, etc.
3. **Use TypeScript**: Better AI understanding
4. **Register tools globally**: `aui.register(tool)`
5. **Batch related tools**: `aui.defineTools({})`

## AI Integration

Tools are designed for AI agents to:
- Discover via registry
- Execute with type safety
- Chain operations
- Handle errors gracefully
- Provide feedback via rendering

## Examples

See `/app/aui/lantos` for live demos:
- Weather widget
- Search with caching
- File operations
- UI manipulation
- Process control
- Database CRUD