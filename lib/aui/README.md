# AUI (Assistant-UI) Tool System

A concise and elegant system for AI to control frontend and backend in Next.js/Vercel applications.

## Quick Start

### Simple Tool - Just 2 Methods
```tsx
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();
```

### Complex Tool - Adds Client Optimization
```tsx
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();
```

## API Reference

### Tool Builder

- `.tool(name)` - Create a new tool builder
- `.input(schema)` - Define input validation with Zod
- `.execute(handler)` - Server-side execution logic
- `.clientExecute(handler)` - Optional client-side execution
- `.render(component)` - React component for rendering results
- `.build()` - Build the final tool definition

### React Components

```typescript
import { ToolExecutorProvider, ToolRenderer, useToolExecutor } from '@/lib/aui/client';

// Provider setup
<ToolExecutorProvider tools={[weatherTool, searchTool]}>
  <App />
</ToolExecutorProvider>

// Render a tool result
<ToolRenderer toolCall={toolCall} tool={weatherTool} />

// Hook usage
const executor = useToolExecutor();
const result = await executor.execute(toolCall);
```

## Architecture

```
lib/aui/
├── core/          # Core builder and registry
├── client/        # Client-side execution and React components
├── server/        # Server-side execution
├── tools/         # Example tool implementations
└── types/         # TypeScript definitions
```