# AUI (Assistant-UI) System Global Memory

## Project Overview
The AUI system is a sophisticated tool framework for enabling AI assistants to control both frontend and backend operations in Next.js/Vercel applications.

## Branch: lantos-aui
Current working branch for AUI enhancements and improvements.

## Key Design Principles
1. **Conciseness**: Minimal API surface with maximum expressiveness
2. **Type Safety**: Full TypeScript and Zod integration
3. **Dual Execution**: Server-first with optional client optimization
4. **React Integration**: First-class React component support
5. **AI-Friendly**: Designed for easy AI agent discovery and usage

## Architecture Components

### Core System
- **Builder Pattern**: Fluent interface for tool construction
- **Registry System**: Global tool registration and discovery
- **Execution Engine**: Dual server/client execution model
- **React Integration**: Hooks and components for UI rendering

### API Patterns
1. **Simple Tool**: `aui.tool().input().execute().render().build()`
2. **Ultra-Concise**: `aui.simple(name, schema, handler, renderer)`
3. **Quick Mode**: Auto-build after render
4. **Server-Only**: `aui.server()` for secure operations
5. **Contextual**: `aui.contextual()` for session/cache access

### File Structure
```
/lib/aui/
├── index.ts           # Main AUI class and exports
├── core/
│   ├── builder.ts     # Tool builder implementation
│   └── registry.ts    # Tool registry system
├── server/
│   └── executor.ts    # Server-side execution
├── client/
│   ├── executor.ts    # Client-side execution with caching
│   ├── components.tsx # React components
│   └── hooks.tsx      # React hooks
├── types/
│   └── index.ts       # TypeScript definitions
└── __tests__/         # Test files
```

## Implementation Status
- ✅ Core builder pattern with fluent interface
- ✅ Multiple concise API variations
- ✅ Server/client dual execution
- ✅ React component integration
- ✅ Type-safe Zod validation
- ✅ Tool registry system
- ✅ Caching and optimization
- ✅ Comprehensive test coverage
- ✅ Example implementations
- ✅ Ultra-concise API methods (t, in, ex, out)
- ✅ One-liner tool creation with define()
- ✅ Batch tool definition with defineTools()
- ✅ AI control tools for frontend/backend
- ✅ Quick mode auto-building

## Usage Examples

### Simple Weather Tool
```tsx
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();
```

### Complex Search Tool with Caching
```tsx
const searchTool = aui
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

## Technical Achievements
1. **Smart Parameter Detection**: Automatically detects function signature patterns
2. **Streaming Support**: Generator functions for real-time data
3. **Batch Execution**: Parallel tool execution capabilities
4. **Progressive Enhancement**: Server-first with client optimization
5. **Type Inference**: Advanced TypeScript for seamless DX

## Latest Enhancements (lantos-aui branch)

### New Ultra-Concise API Methods
1. **t()** - Shorthand for tool()
2. **in()** - Shorthand for input()
3. **ex()** - Shorthand for execute()
4. **out()** - Shorthand for render()
5. **define()** - One-liner tool creation
6. **create()** - Tool creation with auto-registration
7. **defineTools()** - Batch tool definition

### AI Control Tools
Comprehensive suite of tools enabling AI to control:
- **UI Control** - Manipulate DOM elements
- **Backend Control** - Execute server operations
- **Navigation** - Control app routing
- **Form Control** - Fill and submit forms
- **API Calls** - Make authenticated API requests
- **State Management** - Manage application state

## Future Considerations
- WebSocket integration for real-time tools
- GraphQL support for complex queries
- Tool composition and chaining
- Visual tool builder UI
- Performance monitoring dashboard
- Tool versioning and migration
- Tool analytics and usage tracking