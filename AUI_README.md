# AUI (Assistant-UI) - Ultra-Concise API for AI Control

AUI is a powerful, ultra-concise API that enables AI assistants to control both frontend and backend operations in Next.js/Vercel applications through tool calls.

## Quick Start

```tsx
import aui, { z } from '@/lib/aui';

// Simple tool - just 2 methods (NO .build() needed!)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Tool is immediately ready to use!
const result = await simpleTool.run({ city: 'NYC' });
```

## API Patterns

### 1. Simple Tool (2 methods minimum)
```tsx
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);
```

### 2. Minimal Pattern (no input schema)
```tsx
const greetTool = aui
  .tool('greet')
  .execute(async ({ input }: { input: { name: string } }) => 
    `Hello, ${input.name}!`
  )
  .render(({ data }) => <p>{data}</p>);
```

### 3. Using Shorthand
```tsx
// Use aui.t() instead of aui.tool()
const calcTool = aui
  .t('calc')
  .input(z.object({ a: z.number(), b: z.number() }))
  .execute(({ input }) => input.a + input.b)
  .render(({ data }) => <span>Result: {data}</span>);
```

### 4. Complex Tool with Client Optimization
```tsx
const searchTool = aui
  .tool('search')
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
  .render(({ data }) => <SearchResults results={data} />);
```

### 5. Data-Only Pattern (no render)
```tsx
const apiTool = aui
  .tool('api')
  .input(z.object({ endpoint: z.string() }))
  .execute(async ({ input }) => {
    const response = await fetch(input.endpoint);
    return response.json();
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
  .clientExecute(async ({ input, ctx }) => {
    // AI can control UI directly
    switch (input.action) {
      case 'theme':
        document.body.className = input.value;
        break;
      case 'modal':
        // Show modal logic
        break;
    }
    return { success: true };
  })
  .render(({ data }) => <div>UI Updated: {data.success ? '✓' : '✗'}</div>);
```

### Backend Control
```tsx
const dbTool = aui
  .tool('database')
  .input(z.object({
    query: z.string(),
    params: z.array(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // AI can query database
    return await db.query(input.query, input.params);
  })
  .render(({ data }) => <DataTable rows={data} />);
```

## Method Reference

### Core Methods
- `aui.tool(name)` - Create a new tool
- `aui.t(name)` - Shorthand for tool()
- `tool.input(schema)` - Define input schema with Zod
- `tool.execute(handler)` - Define server execution
- `tool.clientExecute(handler)` - Optional client-side execution
- `tool.render(component)` - Define React rendering

### Runtime Methods
- `tool.run(input, context?)` - Execute the tool
- `aui.get(name)` - Get a registered tool
- `aui.execute(name, input, context?)` - Execute by name
- `aui.list()` - List all tool names

### Key Features
- **No .build() needed** - Tools auto-finalize via Proxy
- **Type inference** - Full TypeScript support
- **Dual execution** - Server + optional client
- **Context support** - Cache, fetch, user, session

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

1. **Start Simple**: Just 2 methods (execute + render)
2. **No .build()**: Tools auto-finalize, no build step needed
3. **Add Client Execution**: Only when you need caching or offline support
4. **Type Safety**: Use Zod schemas for validation
5. **Keep Tools Focused**: Each tool should do one thing well

## Installation

```bash
# Already included in this Next.js project
import aui from '@/lib/aui';
```

## Examples

See `/app/aui-demo/page.tsx` for a complete working demo with interactive examples.

## License

MIT