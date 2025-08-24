# Global Memory - Lantos AUI Implementation

## Project Context
- **Branch**: lantos-aui
- **Purpose**: Implement a concise and elegant AUI (Assistant UI) system for AI-controlled frontend and backend operations in Next.js Vercel applications

## Key Components Created

### 1. Enhanced AUI Library (`/lib/aui-enhanced.ts`)
- Fluent API design with method chaining
- Server/client execution separation for Next.js
- Built-in caching with TTL support
- Retry logic with exponential backoff
- Timeout handling
- Error boundaries and handlers
- Batch execution support
- Global context management

### 2. Example Tools (`/examples/aui-tools.tsx`)
- Weather tool (server-side execution)
- Search tool (client-side with caching)
- User tool (with error handling)
- Calculator tool (pure client-side)
- Data fetcher (smart caching for GET requests)

### 3. Showcase Page (`/app/lantos-aui-enhanced/page.tsx`)
- Interactive demo of all tools
- Live examples with real-time results
- Code patterns documentation
- Feature highlights

### 4. Comprehensive Tests (`/__tests__/aui-enhanced.test.ts`)
- Tool creation and validation
- Client/server execution logic
- Caching with TTL
- Retry mechanism
- Timeout handling
- Error management
- Batch execution
- Context management
- Tool registry operations

## Design Principles
- **Simplicity**: Tools defined in 2-4 method calls
- **Type Safety**: Zod schema validation throughout
- **Performance**: Smart caching, retries, and timeouts
- **Developer Experience**: Fluent API, clear patterns
- **AI Integration**: Clear server/client boundaries for AI control

## API Patterns

### Simple Tool
```typescript
const tool = aui
  .tool('name')
  .input(schema)
  .execute(handler)
  .render(component)
```

### Complex Tool with Optimizations
```typescript
const tool = aui
  .tool('name')
  .input(schema)
  .execute(serverHandler)
  .clientExecute(clientHandler)
  .render(component)
  .cache(60000)    // 1 minute
  .retry(3)        // 3 attempts
  .timeout(5000)   // 5 seconds
```

## Next Steps
- Integration with AI agents
- Server actions for Next.js App Router
- WebSocket support for real-time updates
- Plugin system for extending functionality