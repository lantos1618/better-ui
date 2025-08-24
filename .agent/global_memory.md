# Lantos AUI Global Memory

## Project Context
- **Branch**: lantos-aui
- **Goal**: Ultra-concise API for AI control of Next.js/Vercel apps
- **Stack**: Next.js 14.2, React 18.3, TypeScript 5, Zod 3.22

## Key Design Principles
1. **Simplicity** - 2-method minimum for simple tools
2. **Type Safety** - Full TypeScript inference
3. **Dual Execution** - Server + optional client
4. **React Native** - Component rendering built-in
5. **DRY & KISS** - Don't repeat, keep it simple

## Core API Pattern
```tsx
// Simple - just 2 methods
aui.tool('name')
  .input(schema)
  .execute(handler)
  .render(component)

// Complex - adds client optimization
aui.tool('name')
  .input(schema)
  .execute(serverHandler)
  .clientExecute(clientHandler)
  .render(component)
```

## Shorthand Methods
- `aui.t()` - Short for tool()
- `aui.do()` - One-liner simple tools
- `aui.simple()` - Quick setup with all basics
- `aui.ai()` - AI-optimized with retry/cache

## Implementation Progress
- Core Builder: ✅ (lib/aui/lantos-aui.ts)
- Enhanced API: ✅ All shortcuts implemented
- Server Execution: ✅ (app/api/aui/lantos/execute/route.ts)
- Client Optimization: ✅ (lib/aui/client/hooks.tsx & provider.tsx)
- Tool Registry: ✅ (Built into AUI class)
- Example Tools: ✅ (lib/aui/tools/examples.tsx - weather, search, database, calculator, assistant)
- Demo Page: ✅ (app/aui-demo/page.tsx - comprehensive interactive demo)
- Pattern Examples: ✅ (examples/aui-patterns.tsx)
- Testing: ✅ (27/27 tests passing in __tests__/aui-complete.test.ts)
- Documentation: ✅ (docs/AUI_README.md)
- TypeScript: ✅ Consolidated exports in lib/aui/index.ts

## Achievements
- Implemented ultra-concise API with 2-method minimum
- Added 5 shorthand methods for common patterns (t, do, doWith, simple, ai)
- Created AI-optimized tools with retry and caching
- Built comprehensive React integration with hooks and provider
- Full TypeScript support with type inference
- Complete test coverage (27 comprehensive tests)
- Created 5 example tools (weather, search, database, calculator, assistant)
- Built interactive demo page at /aui-demo
- Consolidated all exports in lib/aui/index.ts
- Successfully deployed on lantos-aui branch