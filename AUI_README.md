# AUI (Assistant-UI) - Ultra-Concise API for AI Control

AUI is a powerful, ultra-concise API that enables AI assistants to control both frontend and backend operations in Next.js/Vercel applications through tool calls.

## Quick Start

```tsx
import aui, { z } from '@/lib/aui';

// Simplest tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Register and use
aui.register(simpleTool);
```

## API Patterns

### 1. Ultra-Concise One-Liner
```tsx
// Simplest possible tool
aui.do('ping', () => 'pong');
```

### 2. Simple Tool with Input
```tsx
aui.tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();
```

### 3. Using Shorthand Methods
```tsx
aui.t('calc')  // t = tool
  .i(z.object({ a: z.number(), b: z.number() }))  // i = input
  .e(({ a, b }) => a + b)  // e = execute
  .r(result => <span>{result}</span>)  // r = render
  .b();  // b = build
```

### 4. Complex Tool with Client Optimization
```tsx
aui.tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    return await db.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();
```

### 5. AI-Optimized Tool
```tsx
// Built-in retry and caching for reliability
aui.ai('apiCall', {
  input: z.object({ endpoint: z.string() }),
  execute: async ({ endpoint }) => {
    // May fail - AI optimization handles retries
    return await fetch(endpoint);
  },
  render: ({ data }) => <code>{data}</code>,
  retry: 3,
  cache: true
});
```

## Helper Methods

### `aui.simple()` - Quick tool creation
```tsx
aui.simple(
  'greet',
  z.object({ name: z.string() }),
  ({ name }) => `Hello, ${name}!`,
  msg => <h2>{msg}</h2>
);
```

### `aui.defineTools()` - Batch definition
```tsx
const tools = aui.defineTools({
  query: {
    input: z.object({ sql: z.string() }),
    execute: async ({ sql }) => db.query(sql),
    render: ({ rows }) => <Table data={rows} />
  },
  insert: {
    input: z.object({ table: z.string(), data: z.any() }),
    execute: async ({ table, data }) => db.insert(table, data),
    render: ({ id }) => <span>Inserted #{id}</span>
  }
});
```

## AI Control Examples

### Frontend Control
```tsx
const uiControlTool = aui
  .tool('uiControl')
  .input(z.object({
    action: z.enum(['theme', 'layout', 'modal']),
    value: z.any()
  }))
  .clientExecute(async ({ input }) => {
    // AI can control UI directly
    switch (input.action) {
      case 'theme':
        document.body.className = input.value;
        break;
      case 'modal':
        showModal(input.value);
        break;
    }
    return { success: true };
  })
  .build();
```

### Backend Control
```tsx
const backendTool = aui
  .tool('backend')
  .input(z.object({
    service: z.enum(['database', 'cache', 'queue']),
    operation: z.string(),
    params: z.any()
  }))
  .serverOnly()  // Only runs on server
  .execute(async ({ input }) => {
    // AI can control backend services
    return await services[input.service][input.operation](input.params);
  })
  .build();
```

## Method Reference

### Core Methods
- `tool(name)` / `t(name)` - Create a new tool
- `input(schema)` / `i(schema)` - Define input schema with Zod
- `execute(handler)` / `e(handler)` - Define server execution
- `render(component)` / `r(component)` - Define React rendering
- `build()` / `b()` - Build the tool

### Advanced Methods
- `clientExecute(handler)` / `c(handler)` - Client-side execution
- `serverOnly()` - Restrict to server execution
- `do(name, handler)` - One-liner tool creation
- `ai(name, config)` - AI-optimized tool with retry/cache

### Helper Methods
- `simple()` - Quick tool with input/execute/render
- `defineTools()` - Define multiple tools at once
- `register(tool)` - Register a tool
- `getTool(name)` - Get a registered tool
- `getTools()` - List all registered tools

## Architecture

```
┌─────────────────┐
│   AI Assistant  │
└────────┬────────┘
         │
    ┌────▼────┐
    │   AUI   │
    └────┬────┘
         │
   ┌─────┴─────┐
   │           │
┌──▼──┐    ┌──▼──┐
│Client│    │Server│
└─────┘    └─────┘
```

## Best Practices

1. **Start Simple**: Use `do()` for simple tools, add complexity as needed
2. **Use Shorthand**: `t()`, `i()`, `e()`, `r()`, `b()` for conciseness
3. **Add Client Execution**: Only when you need caching or offline support
4. **AI Optimization**: Use `ai()` for unreliable operations
5. **Type Safety**: Always use Zod schemas for inputs

## Installation

```bash
# Already included in this Next.js project
import aui from '@/lib/aui';
```

## Examples

See `/app/aui/page.tsx` for a complete showcase of all patterns.

## License

MIT