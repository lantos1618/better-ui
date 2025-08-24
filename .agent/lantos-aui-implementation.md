# Lantos AUI Implementation

## Overview
Implemented a concise and elegant AUI (Assistant-UI) system for tool calls with client/server execution in Next.js Vercel applications.

## Core Features

### 1. Simple Tool Pattern (2 methods)
```typescript
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
```

### 2. Complex Tool Pattern (with client optimization)
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

### Core Library
- `/lib/aui/lantos-concise.ts` - Main AUI implementation with fluent API
- `/lib/aui/lantos-provider.tsx` - React context provider for client-side execution

### API Routes
- `/app/api/lantos-aui/tools/[tool]/route.ts` - Dynamic route handler for server-side tool execution

### Examples
- `/examples/lantos-aui-concise.tsx` - Example tool implementations
- `/app/lantos-aui-concise/page.tsx` - Interactive showcase page

### Tests
- `/__tests__/lantos-aui-concise.test.ts` - Comprehensive test suite

## Key Design Decisions

1. **Fluent API**: Method chaining for elegant tool definition
2. **Type Safety**: Zod schema validation throughout
3. **Smart Execution**: Automatic client/server detection based on environment
4. **Built-in Caching**: Context-based cache management for client-side optimization
5. **React Integration**: Render methods return React components directly

## Usage

### Basic Setup
```typescript
import aui from '@/lib/aui/lantos-concise';
import { z } from 'zod';

// Define a tool
const tool = aui
  .tool('myTool')
  .input(z.object({ param: z.string() }))
  .execute(async ({ input }) => ({ result: input.param }))
  .render(({ data }) => <div>{data.result}</div>);

// Run the tool
const result = await tool.run({ param: 'test' });
```

### With Provider (for client-side features)
```tsx
import { AUIProvider, useAUITool } from '@/lib/aui/lantos-provider';

function App() {
  return (
    <AUIProvider>
      <MyComponent />
    </AUIProvider>
  );
}

function MyComponent() {
  const { run } = useAUITool(tool);
  // Use the tool with automatic context
}
```

## Testing
Run tests with: `npm test -- __tests__/lantos-aui-concise.test.ts`

## Next Steps
- Add WebSocket support for real-time updates
- Implement batch execution for multiple tools
- Add middleware system for cross-cutting concerns
- Create VS Code extension for tool generation