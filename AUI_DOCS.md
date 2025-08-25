# AUI - Assistant UI System

Ultra-concise tool system for AI control of Next.js/Vercel applications.

## Quick Start

```tsx
import aui from '@/lib/aui';

// Simple tool - 2 methods minimum
const weather = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }));

// With React rendering
const search = aui
  .tool('search')  
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .render(({ data }) => <SearchResults results={data} />);
```

## API Reference

### Core Methods

#### `aui.tool(name)` / `aui.t(name)`
Create a new tool with chainable configuration.

#### `.input(schema)`
Define input validation using Zod schema.

#### `.execute(handler)`
Server-side execution handler.

#### `.clientExecute(handler)`
Optional client-side execution with caching support.

#### `.render(component)`
React component for rendering results.

### Shorthand Methods

#### `aui.do(name, handler)`
One-liner for simple tools without input:
```tsx
aui.do('timestamp', () => Date.now());
```

#### `aui.simple(name, input, execute, render?)`
Complete tool in one call:
```tsx
aui.simple(
  'weather',
  z.object({ city: z.string() }),
  async (input) => getWeather(input.city),
  (data) => <WeatherCard {...data} />
);
```

#### `aui.ai(name, config)`
AI-optimized tool with retry and caching:
```tsx
aui.ai('search', {
  input: z.object({ query: z.string() }),
  execute: async ({ input }) => search(input.query),
  retry: 3,
  cache: true
});
```

#### `aui.batch(tools)`
Define multiple tools at once:
```tsx
aui.batch({
  add: (input) => input.a + input.b,
  multiply: (input) => input.x * input.y
});
```

## React Integration

### Provider Setup
```tsx
import { AUIProvider } from '@/lib/aui/client';

export default function RootLayout({ children }) {
  return (
    <AUIProvider>
      {children}
    </AUIProvider>
  );
}
```

### Using Tools in Components
```tsx
import { useTool } from '@/lib/aui/client';

function MyComponent() {
  const { execute, loading, data, error } = useTool(weatherTool);
  
  return (
    <div>
      <button onClick={() => execute({ city: 'NYC' })}>
        Get Weather
      </button>
      {loading && <p>Loading...</p>}
      {data && <p>{data.temp}°F</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Tool Renderer Component
```tsx
import { ToolRenderer } from '@/lib/aui/client';

<ToolRenderer 
  tool={searchTool}
  input={{ query: 'AI tools' }}
  autoExecute={true}
/>
```

## Server API

### API Route Handler
```tsx
// app/api/aui/execute/route.ts
import aui from '@/lib/aui';

export async function POST(request) {
  const { tool, input } = await request.json();
  const result = await aui.execute(tool, input);
  return NextResponse.json({ result });
}
```

## Advanced Patterns

### Client-Side Caching
```tsx
const cachedTool = aui
  .tool('data')
  .input(z.object({ id: z.string() }))
  .execute(async ({ input }) => fetchData(input.id))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.id);
    if (cached) return cached;
    
    const data = await ctx.fetch(`/api/data/${input.id}`);
    ctx.cache.set(input.id, data);
    return data;
  });
```

### Tool Composition
```tsx
const pipeline = aui.defineTools({
  fetch: {
    input: z.object({ url: z.string() }),
    execute: async ({ input }) => fetch(input.url).then(r => r.json())
  },
  transform: {
    input: z.any(),
    execute: async ({ input }) => transformData(input)
  },
  render: {
    input: z.any(),
    execute: async ({ input }) => input,
    render: ({ data }) => <DataView data={data} />
  }
});
```

### AI Control Pattern
```tsx
// Enable AI to control UI
const uiControl = aui.ai('updateUI', {
  input: z.object({
    component: z.string(),
    props: z.record(z.any()),
    action: z.enum(['show', 'hide', 'update'])
  }),
  execute: async ({ input }) => {
    // Update UI state based on AI instructions
    return updateComponentState(input);
  },
  render: ({ data }) => <UIPreview changes={data} />
});

// Enable AI to control backend
const dbControl = aui.ai('database', {
  input: z.object({
    operation: z.enum(['query', 'insert', 'update', 'delete']),
    params: z.any()
  }),
  execute: async ({ input }) => {
    // Execute database operations
    return db.execute(input);
  },
  retry: 3,
  cache: true
});
```

## Testing

```tsx
import aui from '@/lib/aui';

describe('AUI Tools', () => {
  it('should execute simple tool', async () => {
    const tool = aui
      .tool('test')
      .input(z.object({ value: z.number() }))
      .execute(async ({ input }) => input.value * 2);
    
    const result = await tool.run({ value: 5 });
    expect(result).toBe(10);
  });
});
```

## Configuration

### TypeScript Types
```tsx
import type { InferToolInput, InferToolOutput } from '@/lib/aui';

const myTool = aui.tool('example')...;

type Input = InferToolInput<typeof myTool>;
type Output = InferToolOutput<typeof myTool>;
```

### Context Customization
```tsx
const context = aui.createContext({
  user: currentUser,
  session: currentSession,
  cache: customCache
});

await aui.execute('toolName', input, context);
```

## Performance

- **Bundle Size**: ~8KB minified (core only)
- **Type Safety**: Full TypeScript inference
- **Caching**: Built-in client-side caching
- **Retry Logic**: Configurable exponential backoff
- **Validation**: Zod schema validation

## Best Practices

1. **Keep tools focused**: One tool, one responsibility
2. **Use caching wisely**: Cache expensive operations
3. **Validate inputs**: Always define input schemas
4. **Handle errors**: Provide meaningful error messages
5. **Optimize renders**: Use React.memo for complex renders

## Examples

See `/examples/aui-patterns.tsx` for comprehensive examples including:
- Simple weather tool
- Complex search with caching
- Database operations
- File uploads
- Real-time updates
- AI-controlled UI/backend

## License

MIT