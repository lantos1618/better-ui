# AUI (Assistant-UI) Global Memory

## Project Overview
AUI is an ultra-concise API for enabling AI to control both frontend and backend in Next.js/Vercel applications through tool calls.

## Key Design Principles
1. **Simplicity** - Minimal API surface, maximum capability
2. **Elegance** - Clean, chainable syntax
3. **Practicality** - Real-world use cases for AI control
4. **Intelligence** - Built-in optimizations for AI reliability

## Core API Patterns

### Ultra-Concise Progression
```tsx
// 1. Simplest - one line
aui.do('ping', () => 'pong')

// 2. Simple with input - 2 methods
aui.tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build()

// 3. Complex with client optimization
aui.tool('search')
  .input(schema)
  .execute(serverHandler)
  .clientExecute(clientHandler)
  .render(component)
  .build()
```

### Shorthand Methods
- `t()` = `tool()`
- `i()` = `input()`
- `e()` = `execute()`
- `r()` = `render()`
- `c()` = `clientExecute()`
- `b()` = `build()`

### Helper Methods
- `aui.simple()` - Quick tool with input/execute/render
- `aui.ai()` - AI-optimized with retry/cache
- `aui.defineTools()` - Batch definition
- `aui.do()` - One-liner tool

## Architecture

### Core Components
1. **Builder** (`/lib/aui/core/builder.ts`) - Chainable API
2. **Registry** (`/lib/aui/core/registry.ts`) - Tool management
3. **Executor** (`/lib/aui/server/executor.ts`) - Server execution
4. **Client Executor** (`/lib/aui/client/executor.ts`) - Client-side with caching

### Type System
- Full TypeScript support with inference
- Zod schemas for runtime validation
- Generic types flow through chain

## AI Control Capabilities

### Frontend Control
- Theme switching
- Layout manipulation  
- Modal/dialog control
- State management
- UI component updates

### Backend Control
- Database operations
- Cache management
- Queue processing
- API calls
- Service orchestration

## Testing Strategy
- Unit tests for builders
- Integration tests for executors
- E2E tests for AI control flows
- 80% implementation, 20% testing

## Performance Optimizations
- Client-side caching
- Retry logic for reliability
- Timeout handling
- Batch execution support

## Current Implementation Status
- ✅ Core builder API
- ✅ Registry system
- ✅ Server execution
- ✅ Client execution
- ✅ Showcase pages
- ✅ Example tools
- ⏳ Comprehensive tests
- ⏳ Documentation

## Next Steps
1. Complete test coverage
2. Add more AI control examples
3. Optimize bundle size
4. Add telemetry/monitoring
