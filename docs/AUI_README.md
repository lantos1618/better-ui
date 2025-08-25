# AUI (Assistant-UI) - Concise AI Tool Control for Next.js

Ultra-concise API for AI-controlled frontend/backend operations in Next.js/Vercel applications.

## Core Philosophy

**Minimum viable tool = 2 methods**: `input()` and `execute()`

## Quick Start

```tsx
import aui, { z } from '@/lib/aui';

// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }));

// Use it
const result = await simpleTool.run({ city: 'NYC' });
```

## API Patterns

### 1. Simple Tool (Backend Only)
```tsx
const tool = aui
  .tool('name')
  .input(z.object({ /* schema */ }))
  .execute(async ({ input }) => { /* logic */ })
  .render(({ data }) => <Component />); // optional
```

### 2. Complex Tool (Frontend + Backend)
```tsx
const tool = aui
  .tool('name')
  .input(z.object({ /* schema */ }))
  .execute(async ({ input }) => { /* server logic */ })
  .clientExecute(async ({ input, ctx }) => {
    // Client optimization: caching, offline, etc.
    const cached = ctx.cache.get(key);
    return cached || ctx.fetch('/api/tool', { body: input });
  })
  .render(({ data }) => <Component />);
```

### 3. Shorthand Methods

```tsx
// No input
aui.do('time', () => new Date().toISOString());

// With input
aui.doWith('greet', z.object({ name: z.string() }), 
  ({ name }) => `Hello, ${name}!`);

// Standard simple
aui.simple('weather', schema, handler, renderer);

// AI-optimized
aui.ai('search', {
  input: schema,
  execute: handler,
  retry: 3,
  cache: true
});
```

## Features

- **Type-safe**: Full TypeScript inference
- **Dual execution**: Server + optional client
- **React native**: Built-in component rendering
- **AI-optimized**: Retry logic, caching, debouncing
- **Minimal API**: 2 methods minimum for simple tools

## Usage in Components

```tsx
function MyComponent() {
  const [result, setResult] = useState(null);
  
  const handleClick = async () => {
    // Simple execution
    const data = await tool.run({ city: 'NYC' });
    
    // With context (for caching)
    const ctx = aui.createContext();
    const data = await tool.run({ city: 'NYC' }, ctx);
    
    setResult(data);
  };
  
  return (
    <div>
      <button onClick={handleClick}>Execute</button>
      {result && tool.renderResult(result)}
    </div>
  );
}
```

## Server Integration

```ts
// app/api/aui/[tool]/route.ts
import aui from '@/lib/aui/lantos-aui';

export async function POST(request: NextRequest) {
  const { tool: toolName, input } = await request.json();
  const tool = aui.get(toolName);
  
  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  }
  
  const result = await tool.run(input);
  return NextResponse.json({ result });
}
```

## Tool Registry

```tsx
// Register tools
aui.register(myTool);

// Get tool
const tool = aui.get('weather');

// Execute by name
const result = await aui.execute('weather', { city: 'NYC' });

// List all tools
const tools = aui.getToolNames();
```

## Batch Definition

```tsx
const tools = aui.defineTools({
  calculator: {
    input: z.object({ a: z.number(), b: z.number() }),
    execute: ({ input }) => ({ result: input.a + input.b })
  },
  translator: {
    input: z.object({ text: z.string() }),
    execute: async ({ input }) => translate(input.text)
  }
});

// Use: tools.calculator.run({ a: 1, b: 2 })
```

## Context & Caching

```tsx
const ctx = aui.createContext({
  cache: new Map(),
  user: { id: '123' },
  session: { token: 'abc' }
});

// Tools can access context
const tool = aui
  .tool('user-data')
  .execute(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    return fetchUserData(userId);
  });
```

## Examples

See `/app/aui-demo/page.tsx` for a live demo.
See `/examples/aui-patterns.tsx` for all patterns.

## License

MIT