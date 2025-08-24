# AUI (Assistant-UI) Global Memory

## Project Context
- **Branch**: lantos-aui
- **Goal**: Ultra-concise API for AI control of Next.js/Vercel apps
- **Stack**: Next.js 14.2, React 18.3, TypeScript 5, Zod 3.22

## Key Design Principles
1. **Simplicity** - 2-method minimum for simple tools
2. **Type Safety** - Full TypeScript inference
3. **Dual Execution** - Server + optional client
4. **React Native** - Component rendering built-in

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

## Implementation Progress
- Core Builder: ✅ (lib/aui/lantos/index.ts)
- Server Execution: ✅ (app/api/aui/lantos/execute/route.ts)
- Client Optimization: ✅ (lib/aui/lantos/hooks.tsx)
- Tool Registry: ✅ (Built into AUI class)
- Example Tools: ✅ (examples/lantos-aui-demo.tsx)
- Testing: ⏳