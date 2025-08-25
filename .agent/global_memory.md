# AUI System - Global Memory

## System Overview
The AUI (Assistant UI) system provides a concise, fluent API for creating tools that can be executed on both client and server sides in Next.js/Vercel applications. This enables AI assistants to control both frontend and backend operations seamlessly.

## Core Architecture

### Key Components
1. **Tool Builder**: Fluent API for creating tools with chainable methods - NO .build() method required
2. **Dual Execution**: Separate client/server execution paths
3. **Smart Caching**: Built-in cache management with TTL
4. **Retry Logic**: Automatic retry with exponential backoff
5. **Tool Registry**: Global registry for AI discovery

### Design Philosophy
- **Concise**: Minimal boilerplate, maximum expressiveness
- **Fluent**: Natural method chaining - every method returns a built tool
- **Type-Safe**: Full TypeScript support with Zod validation
- **AI-Friendly**: Tools are discoverable and self-documenting
- **No Build Required**: Tools are immediately usable without calling .build()

## API Pattern

```typescript
const tool = aui
  .tool('name')
  .input(schema)
  .execute(serverFunction)
  .clientExecute(clientFunction) // optional
  .render(component)              // optional
```

## Key Features

### Required Methods (2 minimum)
- `.tool(name)`: Initialize tool
- `.execute(fn)`: Server-side execution

### Optional Enhancements
- `.input(zodSchema)`: Input validation
- `.clientExecute(fn)`: Client-side optimization
- `.render(component)`: UI rendering
- `.cache(ttl)`: Enable caching
- `.retry(attempts)`: Retry on failure
- `.timeout(ms)`: Execution timeout
- `.description(text)`: Tool documentation
- `.stream(enabled)`: Enable streaming
- `.permissions(...perms)`: Set permissions

## Context System

Each execution receives a context object:
- `cache`: Local cache store
- `fetch`: Fetch API
- `user`: Current user
- `session`: Session data
- `aiAgent`: AI agent identifier
- `metadata`: Additional metadata
- `stream`: Streaming enabled flag

## File Structure

```
/lib/
  aui.ts               # Core implementation (NO lantos files)
  
/lib/aui/
  hooks.tsx            # React hooks (useAUI, useAUIBatch, useAUIStream)
  
/app/api/aui/
  execute/             # Server execution endpoint
    route.ts
    
/app/aui-demo/
  page.tsx             # Demo implementation
  
/__tests__/
  aui.test.ts          # Test suite
  aui-concise.test.ts  # Concise API tests
```

## Integration Points

1. **Server Route**: `/api/aui/execute`
2. **Tool Registry**: Global tool discovery via `aui.registry`
3. **Batch Execution**: Multiple tools in parallel via PUT method
4. **AI Discovery**: Tools expose schema for AI agents

## Best Practices

1. Keep tools focused and single-purpose
2. Use clientExecute only for caching/offline needs
3. Always validate inputs with Zod schemas
4. Provide clear descriptions for AI discovery
5. Test both client and server execution paths
6. Every method returns a built tool - no .build() needed

## Implementation Status
✅ Core AUI system implemented without .build() API
✅ Server-side execution endpoint
✅ Client-side hooks with caching
✅ React rendering integration
✅ Demo page with examples
✅ Comprehensive test suite
✅ Cleaned up all lantos-named files

## Branch: lantos-aui
Despite the branch name, the system is now called AUI (Assistant UI) throughout the codebase.