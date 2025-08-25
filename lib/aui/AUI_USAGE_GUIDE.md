# AUI (Assistant-UI) Usage Guide

AUI is a clean, concise system for creating tool calls that enable AI to control both frontend and backend in Next.js applications.

## Quick Start

```tsx
import aui from '@/lib/aui';
import { z } from 'zod';

// Create a simple tool
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Use it
const result = await weatherTool.run({ city: 'NYC' });
```

## Core API

### Simple Tools (2 methods minimum)

```tsx
const tool = aui
  .tool('name')           // Define tool name
  .input(schema)          // Define input validation
  .execute(handler)       // Define execution logic
  .render(component);     // Define UI rendering
```

### Complex Tools (with client optimization)

```tsx
const tool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side execution
    return await database.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side execution with caching
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/search', { body: input });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <Spinner />;
    if (error) return <Error message={error.message} />;
    return <Results data={data} />;
  });
```

## Context Object

The context (`ctx`) provides utilities for tools:

```tsx
interface AUIContext {
  cache: Map<string, any>;        // Client-side cache
  fetch: typeof fetch;             // Fetch with credentials
  user?: any;                      // Current user
  session?: any;                   // Session data
  env?: Record<string, string>;    // Environment variables
  headers?: HeadersInit;           // Request headers
  cookies?: Record<string, string>;// Cookies
  isServer?: boolean;              // Server/client detection
}
```

## Advanced Features

### Middleware

```tsx
const tool = aui
  .tool('analytics')
  .middleware(async ({ input, ctx, next }) => {
    // Pre-processing
    console.log('Before:', input);
    const result = await next();
    // Post-processing
    console.log('After:', result);
    return result;
  })
  .execute(handler);
```

### Tags & Discovery

```tsx
const tool = aui
  .tool('userAction')
  .tag('user', 'mutation')
  .describe('Updates user profile');

// Find tools by tags
const userTools = aui.findByTag('user');
const mutations = aui.findByTags('user', 'mutation');
```

## Integration with Next.js

### Server Components

```tsx
// app/page.tsx
import { weatherTool } from '@/lib/tools';

export default async function Page() {
  const weather = await weatherTool.run(
    { city: 'SF' },
    { isServer: true }
  );
  
  return weatherTool.renderer?.({ data: weather });
}
```

### Client Components

```tsx
'use client';
import { useState } from 'react';
import { searchTool } from '@/lib/tools';

export default function Search() {
  const [results, setResults] = useState(null);
  
  const handleSearch = async (query: string) => {
    const data = await searchTool.run({ query });
    setResults(data);
  };
  
  return (
    <>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {results && searchTool.renderer?.({ data: results })}
    </>
  );
}
```

### API Routes

```tsx
// app/api/tools/[name]/route.ts
import { NextRequest } from 'next/server';
import aui from '@/lib/aui';

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const input = await request.json();
  const tool = aui.get(params.name);
  
  if (!tool) {
    return Response.json({ error: 'Tool not found' }, { status: 404 });
  }
  
  const result = await tool.run(input, { isServer: true });
  return Response.json(result);
}
```

## Real-World Examples

### Form with Validation

```tsx
const contactForm = aui
  .tool('contact')
  .input(z.object({
    name: z.string().min(2),
    email: z.string().email(),
    message: z.string().min(10)
  }))
  .execute(async ({ input }) => {
    await sendEmail(input);
    return { success: true };
  })
  .render(({ data }) => 
    data?.success ? <Success /> : <Form />
  );
```

### Database Query with Caching

```tsx
const userLookup = aui
  .tool('getUser')
  .input(z.object({ id: z.string().uuid() }))
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cached = ctx.cache.get(`user:${input.id}`);
    if (cached && Date.now() - cached.time < 60000) {
      return cached.data;
    }
    
    // Fetch from API
    const user = await ctx.fetch(`/api/users/${input.id}`);
    ctx.cache.set(`user:${input.id}`, { 
      data: user, 
      time: Date.now() 
    });
    return user;
  })
  .execute(async ({ input }) => {
    // Server-side: direct DB access
    return await db.users.findUnique({ where: { id: input.id } });
  })
  .render(({ data }) => <UserProfile user={data} />);
```

### File Upload

```tsx
const uploadTool = aui
  .tool('upload')
  .input(z.object({
    file: z.instanceof(File),
    folder: z.string().optional()
  }))
  .execute(async ({ input }) => {
    const formData = new FormData();
    formData.append('file', input.file);
    if (input.folder) formData.append('folder', input.folder);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  })
  .render(({ data, loading }) => 
    loading ? <UploadProgress /> : <UploadComplete url={data.url} />
  );
```

## TypeScript Support

AUI provides full TypeScript support with automatic type inference:

```tsx
// Types are inferred automatically
const tool = aui
  .tool('typed')
  .input(z.object({ count: z.number() }))
  .execute(async ({ input }) => ({ 
    doubled: input.count * 2  // input.count is typed as number
  }));

// Extract types if needed
type ToolInput = InferToolInput<typeof tool>;   // { count: number }
type ToolOutput = InferToolOutput<typeof tool>;  // { doubled: number }
```

## Best Practices

1. **Keep tools focused** - Each tool should do one thing well
2. **Use validation** - Always define input schemas with Zod
3. **Handle errors** - Provide error states in render functions
4. **Cache wisely** - Use client-side caching for expensive operations
5. **Optimize for UX** - Show loading states and provide feedback

## Migration from Other Systems

If migrating from other tool systems:

```tsx
// Before (verbose)
const tool = new Tool()
  .setName('example')
  .setInput(schema)
  .setHandler(handler)
  .setRenderer(renderer)
  .build();

// After (AUI - concise)
const tool = aui
  .tool('example')
  .input(schema)
  .execute(handler)
  .render(renderer);
```

No `.build()` method needed - tools are ready to use immediately!