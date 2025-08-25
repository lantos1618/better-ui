# Lantos AUI System - Global Memory

## System Overview
The Lantos AUI (Assistant UI) system provides a concise, fluent API for creating tools that can be executed on both client and server sides in Next.js/Vercel applications. This enables AI assistants to control both frontend and backend operations seamlessly.

## Core Architecture

### Key Components
1. **Tool Builder**: Fluent API for creating tools with chainable methods
2. **Dual Execution**: Separate client/server execution paths
3. **Smart Caching**: Built-in cache management with TTL
4. **Retry Logic**: Automatic retry with exponential backoff
5. **Tool Registry**: Global registry for AI discovery

### Design Philosophy
- **Concise**: Minimal boilerplate, maximum expressiveness
- **Fluent**: Natural method chaining
- **Type-Safe**: Full TypeScript support with Zod validation
- **AI-Friendly**: Tools are discoverable and self-documenting

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

## Context System

Each execution receives a context object:
- `cache`: Local cache store
- `fetch`: Fetch API
- `user`: Current user
- `session`: Session data
- `aiAgent`: AI agent identifier

## File Structure

```
/lib/aui/
  lantos-concise.ts    # Core implementation
  
/app/api/aui/
  lantos-execute/      # Server execution endpoint
    route.ts
    
/examples/
  lantos-aui-*.tsx     # Example implementations
  
/__tests__/
  lantos-aui-*.test.ts # Test suites
```

## Integration Points

1. **Server Route**: `/api/aui/lantos-execute`
2. **Tool Registry**: Global tool discovery
3. **Batch Execution**: Multiple tools in parallel
4. **AI Discovery**: Tools expose schema for AI agents

## Best Practices

1. Keep tools focused and single-purpose
2. Use clientExecute only for caching/offline needs
3. Always validate inputs with Zod schemas
4. Provide clear descriptions for AI discovery
5. Test both client and server execution paths