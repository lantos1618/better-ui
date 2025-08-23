# AUI (Assistant-UI) System

A concise and elegant tool system for Next.js that enables AI assistants to control both frontend and backend through a fluent API.

## Quick Start

```tsx
// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Complex tool - adds client optimization
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

## Core Concepts

### 1. Tool Builder Pattern
- **Fluent API**: Chain methods for clean, readable tool definitions
- **Type Safety**: Full TypeScript support with Zod schemas
- **Minimal Boilerplate**: Only `input()` and `execute()` are required

### 2. Dual Execution Modes

#### Server Execution (Default)
```tsx
.execute(async ({ input, ctx }) => {
  // Runs on the server via /api/aui
  return await database.query(input);
})
```

#### Client Execution (Optional)
```tsx
.clientExecute(async ({ input, ctx }) => {
  // Runs on the client for caching, offline support
  const cached = ctx.cache.get(input.query);
  return cached || ctx.fetch('/api/tools/search', { body: input });
})
```

### 3. React Rendering
```tsx
.render(({ data, input }) => (
  <YourComponent data={data} input={input} />
))
```

## API Reference

### `aui.tool(name)`
Creates a new tool builder.

### `.input(schema)`
Defines the input schema using Zod.

### `.execute(handler)`
Server-side execution handler.

### `.clientExecute(handler)` 
Optional client-side execution for optimization.

### `.render(component)`
Optional React component for rendering results.

### `.description(text)`
Optional tool description for documentation.

### `.build()`
Finalizes and returns the tool definition.

## Usage in Components

```tsx
import { ToolRenderer, ToolExecutorProvider } from '@/lib/aui/client';

export function App() {
  return (
    <ToolExecutorProvider tools={[weatherTool, searchTool]}>
      <ToolRenderer 
        toolCall={{ id: '1', toolName: 'weather', input: { city: 'NYC' }}}
        tool={weatherTool}
      />
    </ToolExecutorProvider>
  );
}
```

## Server API

Tools are automatically exposed via `/api/aui`:

```bash
# List available tools
GET /api/aui

# Execute a tool
POST /api/aui
{
  "toolCall": {
    "id": "unique-id",
    "toolName": "weather",
    "input": { "city": "SF" }
  }
}
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  AUI System  │────▶│   Server    │
│  Component  │     │              │     │   Handler   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
  ToolRenderer     ClientExecutor         ToolExecutor
                    (optional)            (server-side)
```

## Benefits

- **Simplicity**: Minimal API surface, maximum functionality
- **Flexibility**: Works for simple tools and complex workflows
- **Performance**: Client-side caching and optimization when needed
- **Type Safety**: Full TypeScript and Zod validation
- **AI-Ready**: Designed for AI assistants to control UI/backend