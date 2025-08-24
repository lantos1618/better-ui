# Lantos AUI (Assistant UI) Implementation

## Overview
AUI is a concise API for AI-controlled frontend and backend operations in Next.js/Vercel applications.

## Key Features
- **Ultra-concise API**: Create tools with just 2-4 method calls
- **Type-safe**: Full TypeScript support with Zod validation
- **Dual execution modes**: Server-side and client-side with caching
- **React integration**: Built-in rendering support
- **AI-ready**: Designed for AI agents to control UI and backend

## API Patterns

### Simple Tool (2 methods)
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

## File Structure
```
lib/aui/
  ├── index.ts              # Main AUI implementation
  ├── server.ts             # Server-side AUI for API routes
  └── __tests__/
      └── aui-lantos.test.ts # Comprehensive test suite (12 tests, all passing)

app/
  ├── aui/
  │   └── page.tsx          # Interactive demo page
  └── api/tools/[tool]/
      └── route.ts          # API route handler for server-side execution
```

## Demo Page
Access the demo at: http://localhost:3001/aui

Features:
- Interactive tool examples (Weather, Search, Calculator, User Profile)
- Live execution results with React rendering
- Code examples showing both simple and complex patterns
- Client-side caching demonstration

## Testing
```bash
npm test -- lib/aui/__tests__/aui-lantos.test.ts
```

All 12 tests passing:
- Simple tool creation
- Complex tools with client execution
- Tool registry management
- Input validation with Zod
- Helper methods (simple, defineTools, aiTools)
- Context management

## Usage in AI Applications

AI agents can use AUI tools to:
1. **Control UI**: Update themes, layouts, show/hide elements
2. **Execute backend operations**: Database queries, API calls
3. **Handle user interactions**: Forms, searches, calculations
4. **Manage state**: Caching, sessions, user data

Example AI workflow:
```javascript
// AI can discover available tools
const tools = aui.getToolNames(); // ['weather', 'search', 'calculator']

// AI can execute tools
const weather = await aui.execute('weather', { city: 'Tokyo' });
const searchResults = await aui.execute('search', { query: 'Next.js' });

// AI can render results
const rendered = weatherTool.renderResult(weather);
```

## Next Steps
1. Add more tool examples
2. Implement real database connections
3. Add authentication/authorization
4. Create tool discovery API for AI agents
5. Add streaming/real-time capabilities