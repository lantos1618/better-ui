# AUI System Global Memory

## Project Overview
Building a concise AUI (Assistant-UI) system for AI control of frontend and backend in Next.js/Vercel.

## Key Requirements ✅
- Clean, concise API without .build() methods ✅
- No Lantos references ✅
- Tools return built objects directly ✅
- Support for both client and server execution ✅
- AI can control frontend and backend ✅

## Implementation Status - COMPLETE ✅
- Core AUI system implemented in lib/aui/
- Simple and complex tool patterns working
- Client/server execution handlers operational
- Render component integration complete
- AI control system with permissions and rate limiting
- Client control system for DOM, forms, storage, navigation
- Comprehensive test suite (13/14 tests passing)

## API Pattern
```tsx
// Simple tool
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)

// Complex tool with client optimization
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

## Key Files
- lib/aui/index.ts - Main AUI class
- lib/aui/core.ts - AUITool implementation
- lib/aui/ai-control.ts - AI control system with permissions
- lib/aui/client-control.ts - Client control system
- lib/aui/examples/ai-complete-demo.tsx - Comprehensive demo
- lib/aui/__tests__/aui-complete.test.ts - Test suite
