# AUI (Assistant-UI) System Documentation

## Overview
The AUI system provides a concise, type-safe API for creating tools that can be executed on both client and server sides in Next.js applications. It enables AI assistants to control frontend and backend operations seamlessly.

## Core Features
- ✅ Ultra-concise API - tools defined in 2-4 method calls
- ✅ Type-safe with Zod schema validation
- ✅ Server and client execution modes
- ✅ Built-in React rendering
- ✅ Context for caching and state management
- ✅ AI-ready tool execution

## Implementation Status
- **Core Library**: `/lib/aui/index.ts` - Complete
- **React Hooks**: `/lib/aui/hooks/useAUITool.ts` - Complete
- **API Routes**: `/app/api/aui/execute/route.ts` - Complete
- **Example Tools**: `/lib/aui/examples/tools.tsx` - Complete
- **Demo Page**: `/app/aui/page.tsx` - Complete
- **Tests**: 36 tests passing

## API Patterns

### Simple Tool (2 methods minimum)
```tsx
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
```

### Complex Tool (with client optimization)
```tsx
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

## Usage in Components

### With Hook
```tsx
import { useAUITool } from '@/lib/aui/hooks/useAUITool';

function MyComponent() {
  const { execute, data, loading, error } = useAUITool(weatherTool, {
    cache: true,
    cacheTime: 60000
  });
  
  return (
    <button onClick={() => execute({ city: 'Tokyo' })}>
      Get Weather
    </button>
  );
}
```

### Direct Execution
```tsx
const ctx = aui.createContext();
const result = await weatherTool.run({ city: 'Tokyo' }, ctx);
```

## Available Example Tools
1. **weather** - Simple weather data with temperature and conditions
2. **search** - Complex search with client-side caching
3. **calculator** - Pure function for mathematical operations
4. **userProfile** - User data with session context awareness
5. **chart** - Data visualization with normalization
6. **form** - Form submission with validation and optimistic updates

## Architecture
- Tools are registered globally via the singleton `aui` instance
- Each tool maintains its own configuration (schema, handlers, renderer)
- Context provides shared state, caching, and fetch capabilities
- Client execution is optional and only used when optimization is needed
- Server execution is the default for security and data integrity

## Testing
Run tests with: `npm test -- --testPathPattern=aui`

## Next Steps
- Add middleware support for authentication/authorization
- Implement streaming responses for long-running operations
- Add WebSocket support for real-time updates
- Create more complex tool examples with database integration