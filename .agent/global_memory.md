# AUI System Global Memory

## Project Overview
Building a concise AUI (Assistant-UI) system for AI control of frontend and backend in Next.js/Vercel.

## Key Requirements
- Clean, concise API without .build() methods
- No Lantos references
- Tools return built objects directly
- Support for both client and server execution
- AI can control frontend and backend

## Implementation Status
- Core AUI system exists in lib/aui/
- Simple and complex tool patterns implemented
- Client/server execution handlers working
- Render component integration complete

## API Pattern
```tsx
const tool = aui
  .tool('name')
  .input(schema)
  .execute(handler)
  .clientExecute(optionalHandler)
  .render(component)
```

## Key Files
- lib/aui/index.ts - Main AUI class
- lib/aui/core.ts - AUITool implementation
- lib/aui/ai-control.ts - AI control system
- lib/aui/client-control.ts - Client control system
