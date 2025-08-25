# AUI (Assistant-UI) System Documentation

## Overview
AUI is a concise, powerful tool system that enables AI assistants to control both frontend and backend operations in Next.js/Vercel applications.

## Core API

### Simple Tool (2 methods minimum)
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
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
```

## Key Features

### ✅ Clean, Fluent API
- No `.build()` methods required
- Tools return directly and are ready to use
- Chainable method pattern

### ✅ Dual Execution Modes
- **Server Execute**: Runs on server (database, API calls)
- **Client Execute**: Runs in browser (DOM manipulation, caching)
- Automatically switches based on context

### ✅ Built-in Context
```tsx
interface AUIContext {
  cache: Map<string, any>      // Client-side cache
  fetch: typeof fetch           // Fetch API
  user?: any                    // User session
  isServer?: boolean            // Environment detection
}
```

### ✅ Type Safety
- Full TypeScript support
- Zod schema validation
- Type inference throughout

## Tool Methods

### Required Methods
- `.tool(name)` - Create a new tool
- `.input(schema)` - Define input validation
- `.execute(handler)` - Server-side execution

### Optional Methods
- `.clientExecute(handler)` - Client-side execution
- `.render(component)` - React component renderer
- `.middleware(fn)` - Add middleware
- `.describe(text)` - Add description
- `.tag(...tags)` - Add tags for discovery

## Usage Examples

### 1. Frontend Control (AI manipulates UI)
```tsx
const uiTool = aui
  .tool('ui-control')
  .input(z.object({ 
    action: z.enum(['show', 'hide', 'toggle']),
    selector: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const el = document.querySelector(input.selector);
    el.style.display = input.action === 'hide' ? 'none' : 'block';
    return { success: true };
  })
```

### 2. Backend Control (AI manages database)
```tsx
const dbTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    collection: z.string(),
    data: z.any()
  }))
  .execute(async ({ input }) => {
    // Your database operations
    return await db[input.operation](input.collection, input.data);
  })
```

### 3. Form Generation (AI creates forms)
```tsx
const formTool = aui
  .tool('form-generator')
  .input(z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'email', 'select']),
      label: z.string()
    }))
  }))
  .render(({ data }) => (
    <form>
      {data.fields.map(field => (
        <input key={field.name} type={field.type} />
      ))}
    </form>
  ))
```

## Using Tools

### In React Components
```tsx
import { useAUITool } from '@/lib/aui';

function MyComponent() {
  const { execute, loading, data, error } = useAUITool('weather');
  
  const handleClick = () => {
    execute({ city: 'New York' });
  };
  
  return (
    <div>
      <button onClick={handleClick}>Get Weather</button>
      {data && <div>{data.temp}°</div>}
    </div>
  );
}
```

### Programmatically
```tsx
// Execute directly
const result = await weatherTool.run({ city: 'NYC' });

// With context
const result = await searchTool.run(
  { query: 'typescript' },
  { 
    cache: new Map(),
    user: { id: 1 }
  }
);
```

### With AI Integration
```tsx
// Register tools for AI assistant
const assistant = createAIAssistant({
  tools: [weatherTool, searchTool, dbTool],
  permissions: ['read', 'write']
});

// AI can now call these tools
await assistant.execute('Get weather for NYC');
```

## File Structure
```
lib/aui/
├── index.ts           # Main AUI class and exports
├── core.ts            # AUITool implementation
├── client-executor.ts # Client-side execution with caching
├── server-executor.ts # Server-side execution
├── ai-control.ts      # AI control system
├── hooks/             # React hooks
│   ├── useAUITool.ts
│   └── useAUITools.ts
├── tools/             # Pre-built tools
│   ├── dom-tools.tsx
│   ├── form-tools.tsx
│   └── data-tools.tsx
└── examples/          # Usage examples
```

## API Endpoints
```
/api/aui/execute       # Execute tools server-side
/api/aui/tools/[tool]  # Tool-specific endpoints
/api/aui/batch         # Batch tool execution
```

## Best Practices

1. **Keep tools focused** - One tool, one responsibility
2. **Use client execution** - For UI manipulation and caching
3. **Use server execution** - For database and secure operations
4. **Add validation** - Always define input schemas
5. **Provide renderers** - For visual feedback
6. **Cache when appropriate** - Use context.cache for expensive operations

## Advanced Features

### Middleware
```tsx
const protectedTool = aui
  .tool('admin')
  .middleware(async ({ ctx, next }) => {
    if (!ctx.user?.isAdmin) throw new Error('Unauthorized');
    return next();
  })
  .execute(async () => { /* admin action */ })
```

### Tool Discovery
```tsx
// Find tools by tag
const uiTools = aui.findByTag('ui');
const dataTools = aui.findByTag('database');

// List all tools
const allTools = aui.list();
```

### Streaming Responses
```tsx
const streamTool = aui
  .tool('stream')
  .execute(async function* ({ input }) {
    yield 'Starting...';
    await delay(1000);
    yield 'Processing...';
    await delay(1000);
    yield 'Complete!';
  })
```

## Testing
```tsx
import { AUITool } from '@/lib/aui';

describe('My Tool', () => {
  it('should execute correctly', async () => {
    const tool = new AUITool('test')
      .input(z.object({ value: z.number() }))
      .execute(async ({ input }) => input.value * 2);
    
    const result = await tool.run({ value: 5 });
    expect(result).toBe(10);
  });
});
```

## Summary
AUI provides a clean, concise API for creating tools that AI assistants can use to control both frontend and backend operations. With just 2 methods (input + execute), you can create powerful tools that enable AI-driven interactions in your Next.js applications.