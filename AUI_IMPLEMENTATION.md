# AUI (Assistant-UI) Implementation

A concise, elegant system for AI tool control in Next.js/Vercel applications.

## Core Philosophy

- **No .build() methods** - Tools are ready to use immediately
- **Chainable API** - Fluent interface for tool creation
- **Client/Server flexibility** - Optional client-side optimization
- **Type-safe** - Full TypeScript and Zod integration

## Quick Start

```tsx
import aui, { z } from '@/lib/aui';

// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);
```

## Key Features

### 1. Tool Creation
- `aui.tool(name)` - Create a new tool
- `.input(schema)` - Define input validation with Zod
- `.execute(handler)` - Server-side execution
- `.clientExecute(handler)` - Optional client-side optimization
- `.render(component)` - React component for rendering results

### 2. Context System
Every tool receives a context with:
- `cache` - Map for caching results
- `fetch` - Fetch function for API calls
- `isServer` - Server/client detection
- `user`, `session`, `env` - Optional context data

### 3. Middleware Support
```tsx
tool.middleware(async ({ input, ctx, next }) => {
  console.log('Before execution');
  const result = await next();
  console.log('After execution');
  return result;
});
```

### 4. Tool Management
```tsx
// Execute by name
const result = await aui.execute('weather', { city: 'NYC' });

// Find tools
const aiTools = aui.findByTag('ai');
const searchTools = aui.findByTags('ai', 'search');

// List all tools
const allTools = aui.list();
```

## File Structure

```
lib/aui/
├── index.ts              # Core AUI system
├── types.ts              # TypeScript types
├── provider.tsx          # React context provider
├── server.ts             # Server-side utilities
├── hooks/
│   └── useAUITool.ts    # React hooks
├── examples/
│   └── core-tools.tsx   # Example tools
└── __tests__/
    └── core.test.ts     # Comprehensive tests
```

## Usage in Components

```tsx
'use client';

import { simpleTool } from '@/lib/aui/examples/core-tools';

export default function Weather() {
  const [result, setResult] = useState(null);
  
  const getWeather = async (city: string) => {
    const data = await simpleTool.run({ city });
    setResult(data);
  };
  
  return (
    <div>
      <button onClick={() => getWeather('London')}>
        Get Weather
      </button>
      {result && simpleTool.renderer({ data: result })}
    </div>
  );
}
```

## API Routes

Tools can be exposed as API endpoints:

```tsx
// app/api/tools/[tool]/route.ts
import aui from '@/lib/aui';

export async function POST(
  request: Request,
  { params }: { params: { tool: string } }
) {
  const input = await request.json();
  const result = await aui.execute(params.tool, input);
  return Response.json(result);
}
```

## Testing

All core functionality is thoroughly tested:
- Input validation
- Server/client execution
- Middleware chains
- Tool management
- Context handling

Run tests with: `npm test lib/aui/__tests__/core.test.ts`

## Design Principles

1. **Simplicity** - Minimal API surface
2. **Elegance** - Clean, chainable syntax
3. **Practicality** - Real-world patterns
4. **Intelligence** - Smart defaults and caching

## AI Control Integration

The AUI system enables AI assistants to control both frontend and backend through tool calls, providing a seamless bridge between AI capabilities and application functionality.