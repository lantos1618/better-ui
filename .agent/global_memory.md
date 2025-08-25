# Global Memory - Lantos AUI Implementation

## Project Context
- **Branch**: lantos-aui
- **Purpose**: Implement a concise and elegant AUI (Assistant UI) system for AI-controlled frontend and backend operations in Next.js Vercel applications
- **Latest Update**: Complete implementation with demo and integration tests (2025-08-25)

## Key Components Created

### 1. Lantos Concise AUI (`/lib/aui/lantos-concise.ts`)
- Ultra-concise fluent API - tools in just 2-4 method calls
- Advanced features:
  - Smart caching with TTL and automatic expiry
  - Retry logic with exponential backoff
  - Timeout handling for long operations
  - Client/server execution separation
  - AI agent context support
  - Tool registry for discovery
  - Batch execution capabilities
- Type-safe with Zod validation
- Optimized for both development speed and runtime performance

### 2. Enhanced Examples (`/examples/lantos-aui-concise.tsx`)
- Simple weather tool (2 methods)
- Complex search tool with caching
- AI assistant tool with advanced features
- Calculator tool 
- Database tool with operation-aware caching
- Demonstrates batch execution

### 3. Server API Route (`/app/api/aui/lantos-execute/route.ts`)
- POST: Execute any registered tool server-side
- GET: Discover all available tools
- Full error handling and validation
- AI agent context support

### 4. Demo Page (`/app/lantos-aui/demo/page.tsx`)
- Interactive demo showcasing all AUI features
- Live examples of weather, search, and calculator tools
- Batch execution demonstration
- Tool registry display

### 5. Comprehensive Tests
- **Unit Tests** (`/__tests__/lantos-aui-concise.test.ts`): 20 passing tests
- **Integration Tests** (`/__tests__/lantos-aui-integration.test.ts`): 5 passing tests covering:
  - Tool creation with fluent API
  - Input validation with Zod
  - Client/server execution logic
  - Caching with TTL and expiry
  - Retry with exponential backoff
  - Timeout handling
  - Tool registry and discovery
  - Batch execution
  - Context management
  - Schema export for AI

## Design Principles
- **Simplicity**: Tools defined in 2-4 method calls
- **Type Safety**: Zod schema validation throughout
- **Performance**: Smart caching, retries, and timeouts
- **Developer Experience**: Fluent API, clear patterns
- **AI Integration**: Clear server/client boundaries for AI control

## API Patterns

### Simple Tool (exactly as requested)
```typescript
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
```

### Complex Tool (exactly as requested)
```typescript
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
```

### With Advanced Features
```typescript
const aiTool = aui
  .tool('ai-assistant')
  .description('AI code generator')
  .input(z.object({ prompt: z.string() }))
  .execute(async ({ input }) => generateCode(input))
  .cache(300000)   // 5 minutes
  .retry(2)        // Retry twice
  .timeout(10000)  // 10 second timeout
  .render(({ data }) => <CodeBlock code={data} />)
```

## Features Implemented
- ✅ Concise fluent API (2-4 methods per tool)
- ✅ Server/client execution separation
- ✅ Built-in caching with TTL
- ✅ Automatic retry with exponential backoff
- ✅ Timeout handling
- ✅ AI agent context support
- ✅ Tool registry and discovery
- ✅ Batch execution
- ✅ Zod schema validation
- ✅ React component rendering
- ✅ Comprehensive test coverage

## Usage
```typescript
// Import
import aui from '@/lib/aui/lantos-concise';
import { z } from 'zod';

// Create tool
const tool = aui.tool('name')...

// Register for AI discovery
aui.register(tool);

// Execute
const result = await tool.run(input);

// Or execute by name
const result = await aui.execute('name', input);

// Batch execution
const results = await aui.batch([
  { tool: 'tool1', input: {...} },
  { tool: 'tool2', input: {...} }
]);
```