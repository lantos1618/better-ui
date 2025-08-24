# AUI (Assistant UI) System Documentation

## Overview
AUI is an ultra-concise tool system for enabling AI control of frontend and backend operations in Next.js/Vercel applications.

## Core Architecture

### 1. Tool Definition (`lib/aui/lantos-ultra.ts`)
The core system provides a fluent builder pattern for creating tools:

```typescript
const tool = aui
  .tool('name')
  .input(schema)        // Optional: Zod schema for validation
  .execute(handler)     // Server-side execution
  .clientExecute(handler) // Optional: Client-side optimization
  .render(component)    // Optional: React component for rendering
```

### 2. Key Components

- **Tool Class**: Chainable builder for tool configuration
- **AUI Class**: Registry and executor for tools
- **Context**: Provides cache, fetch, user, and session data

## Usage Patterns

### Simple Tool (2 methods minimum)
```typescript
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
```

### Complex Tool (with client optimization)
```typescript
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
```

## File Structure

```
lib/aui/
├── index.ts           # Main export point
├── lantos-ultra.ts    # Core tool system
├── hooks.tsx          # React hooks (useAUI, AUIProvider)
├── client.tsx         # Client-side utilities
└── server.ts          # Server-side utilities

app/
├── api/aui/execute/   # API endpoint for tool execution
└── aui-showcase/      # Demo and examples
```

## Key Features

1. **Validation**: Built-in Zod schema validation
2. **Caching**: Client-side cache via context
3. **Type Safety**: Full TypeScript support with inference
4. **React Integration**: Hooks and rendering support
5. **Server/Client Split**: Optimized execution paths

## API Reference

### Core Methods
- `aui.tool(name)`: Create a new tool
- `aui.get(name)`: Retrieve a tool by name
- `aui.execute(name, input, ctx?)`: Execute a tool
- `aui.list()`: Get all registered tools
- `aui.clear()`: Remove all tools
- `aui.has(name)`: Check if tool exists

### React Hooks
- `useAUI()`: Access AUI context
- `useToolExecution(tool)`: Execute a specific tool
- `AUIProvider`: Context provider for React apps

## Testing
Comprehensive test suite in `__tests__/aui.test.ts` covering:
- Tool creation and execution
- Input validation
- Client/server execution paths
- Context management
- Registry operations

## Production Notes
- Tools are registered globally when created
- Client execution only runs when context is provided
- Cache is per-context, not global
- Render functions are optional but recommended for UI tools