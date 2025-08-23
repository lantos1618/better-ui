# AUI (Assistant-UI) Global Memory

## Project Overview
AUI is an ultra-concise API for enabling AI to control frontend and backend operations in Next.js/Vercel applications through tool calls.

## Key Design Principles
1. **Ultra-Concise API**: Minimize boilerplate, maximize expressiveness
2. **AI Control**: Enable seamless frontend/backend control through tool calls
3. **Type Safety**: Full TypeScript support with Zod schemas
4. **Flexibility**: Support both simple and complex use cases
5. **Elegance**: Beautiful, intuitive API that's a joy to use

## Core Components
- **Builder Pattern**: Fluent interface for tool creation
- **Tool Registry**: Global and scoped tool management
- **Dual Execution**: Server and client execution modes
- **React Integration**: Native rendering components
- **Context System**: Built-in caching and state management

## API Patterns Implemented

### Basic Pattern (User's Request)
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
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();
```

### Ultra-Concise Variations
1. **Ultra-Short**: `t()`, `in()`, `ex()`, `out()`
2. **One-Liner**: `define()` for complete tool in one call
3. **Quick Mode**: Auto-build after render
4. **Batch Definition**: `defineTools()` for multiple tools
5. **Helper Functions**: `simple()`, `server()`, `contextual()`, `ai()`

## Implementation Status
✅ Core builder pattern
✅ Type system and interfaces
✅ Server execution handlers
✅ Client execution with caching
✅ React rendering system
✅ Example tools (weather, search, database, etc.)
✅ Comprehensive test suite (76 tests passing)
✅ Ultra-concise API variations
✅ AI-optimized control patterns

## Key Files
- `/lib/aui/index.ts` - Main entry point and AUI class
- `/lib/aui/core/builder.ts` - Tool builder implementation
- `/lib/aui/client/executor.ts` - Client-side execution
- `/lib/aui/server/handler.ts` - Server-side handlers
- `/lib/aui/types.ts` - TypeScript interfaces
- `/lib/aui/examples/` - Usage examples
- `/lib/aui/__tests__/` - Test suite

## Testing
All 76 tests passing across 5 test suites:
- builder.test.ts - Core builder pattern
- executor.test.ts - Execution logic
- aui-api.test.ts - Main API surface
- aui-concise.test.ts - Concise patterns
- ultra-concise.test.ts - Ultra-concise shortcuts

## Branch Information
- Branch: lantos-aui
- Status: Implementation complete and tested
- Ready for: Integration and deployment