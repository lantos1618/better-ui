# AUI System Global Memory

## Overview
AUI (Assistant-UI) is a concise and elegant tool system for Next.js/Vercel that enables AI to control both frontend and backend through tool calls.

## Key Features
- Clean, fluent API without .build() methods
- Simple tools need only 2 methods: execute() and render()
- Complex tools can add clientExecute() for client-side optimization
- TypeScript and Zod schema integration
- React component rendering
- Middleware support for auth/logging
- Context system for caching and state management

## API Design

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
- /lib/aui/ - Core AUI implementation
- /lib/aui/index.ts - Main AUI class and tool builder
- /lib/aui/examples/ - Example implementations
- /lib/aui/hooks/ - React hooks for AUI
- /lib/aui/ai-control.ts - AI control system
- /app/aui-clean-demo/ - Clean demo page

## Testing
All tests passing (109 tests)
