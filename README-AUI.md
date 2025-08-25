# AUI (Assistant-UI) System

A concise, elegant tool system for AI control of frontend and backend in Next.js/Vercel applications.

## Quick Start

```tsx
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);
```

## Core Features

### 1. Clean API Design
- No `.build()` methods required
- Fluent, chainable interface
- Type-safe with TypeScript and Zod
- Tools are immediately usable after definition

### 2. Execution Modes
- **Server execution** (default): Runs on the server
- **Client execution**: Optional optimization for caching, offline support
- **Automatic fallback**: Client tries cache, then server

### 3. React Integration
```tsx
import { useAUITool } from '@/lib/aui';

function MyComponent() {
  const { execute, data, loading, error } = useAUITool(weatherTool);
  
  return (
    <button onClick={() => execute({ city: 'NYC' })}>
      Get Weather
    </button>
  );
}
```

### 4. AI Control Examples

#### Frontend Control
```tsx
const uiControl = aui
  .tool('ui-control')
  .input(z.object({ 
    action: z.enum(['show', 'hide', 'toggle']),
    element: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const el = document.querySelector(input.element);
    // Manipulate DOM directly
    return { success: true };
  });
```

#### Backend Control
```tsx
const dbTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any()
  }))
  .execute(async ({ input }) => {
    // Database operations
    return await db[input.operation](input.table, input.data);
  });
```

## API Reference

### Tool Creation
```tsx
aui.tool(name: string): AUITool
```

### Tool Methods
- `.input(schema)` - Define input validation with Zod
- `.execute(handler)` - Server-side execution
- `.clientExecute(handler)` - Client-side execution (optional)
- `.render(component)` - React component for rendering results
- `.middleware(fn)` - Add middleware for auth, logging, etc.
- `.describe(text)` - Add description for AI discovery
- `.tag(...tags)` - Add tags for organization

### Execution Context
```tsx
interface AUIContext {
  cache: Map<string, any>;      // Client-side cache
  fetch: typeof fetch;           // Fetch function
  user?: any;                    // User data
  session?: any;                 // Session data
  env?: Record<string, string>;  // Environment variables
  isServer?: boolean;            // Server/client indicator
}
```

### Running Tools
```tsx
// Direct execution
const result = await tool.run(input, context);

// Via AUI instance
const result = await aui.execute('tool-name', input, context);
```

## Setup

### 1. Install Dependencies
```bash
npm install zod
```

### 2. Create API Route
```tsx
// app/api/tools/[tool]/route.ts
import { NextRequest } from 'next/server';
import aui from '@/lib/aui';

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  const input = await request.json();
  const result = await aui.execute(params.tool, input);
  return Response.json(result);
}
```

### 3. Wrap App with Provider
```tsx
// app/layout.tsx
import { AUIProvider } from '@/lib/aui';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AUIProvider>{children}</AUIProvider>
      </body>
    </html>
  );
}
```

## Examples

See `/lib/aui/examples/` for complete examples:
- `user-requested.tsx` - Examples matching the exact API requested
- `ai-control.tsx` - AI control patterns for frontend/backend
- `demo-tools.tsx` - Advanced examples with caching and middleware

## Testing

```bash
# Run all AUI tests
npm test lib/aui

# Run specific test suite
npm test lib/aui/__tests__/user-requested.test.ts
```

## Architecture

```
lib/aui/
├── index.ts          # Core AUI classes
├── provider.tsx      # React context provider
├── server.ts         # Server utilities
├── hooks/            # React hooks
├── examples/         # Example implementations
└── __tests__/        # Test suites
```

## Design Principles

1. **Simplicity**: Minimal API surface, maximum capability
2. **Type Safety**: Full TypeScript and Zod validation
3. **Performance**: Client caching, server optimization
4. **AI-Ready**: Designed for AI agents to discover and use
5. **DRY & KISS**: No repetition, keep it simple

## License

MIT