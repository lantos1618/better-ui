# Lantos AUI - Ultra-Concise API for AI Control

**AUI (Assistant-UI)** is an ultra-concise API that enables AI assistants to control both frontend and backend operations in Next.js/Vercel applications through tool calls.

## ✨ Key Features

- **No .build() required** - Tools work immediately after definition
- **Minimal API** - Just 2 methods needed for basic tools
- **Full TypeScript support** - Complete type inference throughout
- **Client/Server execution** - Optimized for different environments
- **Built-in React integration** - Render methods and hooks included
- **AI-optimized helpers** - Automatic retry and caching

## 🚀 Quick Start

```tsx
import aui, { z } from '@/lib/aui/lantos-aui';

// Simplest tool - just 2 methods required!
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// That's it! No .build() needed - use it immediately
const result = await weatherTool.run({ city: 'SF' });
```

## 📚 API Patterns

### 1. Ultra-Simple Tool
```tsx
// Just input and execute - minimum viable tool
const simple = aui
  .tool('simple')
  .input(z.object({ value: z.string() }))
  .execute(async ({ input }) => input.value.toUpperCase());
```

### 2. One-Liner Tool
```tsx
// For the simplest cases
aui.do('ping', () => 'pong');
```

### 3. Simple Helper
```tsx
// All basics in one call
aui.simple(
  'greet',
  z.object({ name: z.string() }),
  ({ name }) => `Hello, ${name}!`,
  msg => <h2>{msg}</h2>
);
```

### 4. Complex Tool with Client Optimization
```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    return await db.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);
```

### 5. AI-Optimized Tool
```tsx
// Built-in retry and caching for reliability
aui.ai('apiCall', {
  input: z.object({ endpoint: z.string() }),
  execute: async ({ input }) => {
    // May fail - AI optimization handles retries
    return await fetch(input.endpoint);
  },
  render: ({ data }) => <code>{data}</code>,
  retry: 3,
  cache: true
});
```

### 6. Batch Definition
```tsx
const tools = aui.defineTools({
  query: {
    input: z.object({ sql: z.string() }),
    execute: async ({ input }) => db.query(input.sql),
    render: ({ data }) => <Table rows={data} />
  },
  insert: {
    input: z.object({ table: z.string(), data: z.any() }),
    execute: async ({ input }) => db.insert(input.table, input.data),
    render: ({ data }) => <span>Inserted #{data.id}</span>
  }
});
```

## 🪝 React Hooks

### useAUITool Hook
```tsx
function MyComponent() {
  const weather = useAUITool(weatherTool);
  
  return (
    <div>
      <button onClick={() => weather.execute({ city: 'NYC' })}>
        {weather.loading ? 'Loading...' : 'Get Weather'}
      </button>
      
      {weather.error && <div>Error: {weather.error.message}</div>}
      {weather.data && weather.render()}
    </div>
  );
}
```

### useAUI Hook (Multiple Tools)
```tsx
function Dashboard() {
  const aui = useAUI();
  
  const handleSearch = async (query: string) => {
    const result = await aui.execute(searchTool, { query });
    console.log('Search result:', result);
  };
  
  return (
    <div>
      {aui.isExecuting('search') && <Spinner />}
      {aui.getError('search') && <Error />}
    </div>
  );
}
```

## 🎮 AI Control Examples

### Frontend Control
```tsx
const uiControl = aui
  .tool('uiControl')
  .input(z.object({
    action: z.enum(['theme', 'layout', 'modal']),
    value: z.any()
  }))
  .clientExecute(async ({ input }) => {
    // AI can control UI directly
    switch (input.action) {
      case 'theme':
        document.body.className = input.value;
        break;
      case 'modal':
        showModal(input.value);
        break;
    }
    return { success: true };
  });
```

### Backend Control
```tsx
const backendControl = aui
  .tool('backend')
  .input(z.object({
    service: z.enum(['database', 'cache', 'queue']),
    operation: z.string(),
    params: z.any()
  }))
  .execute(async ({ input }) => {
    // AI can control backend services
    return await services[input.service][input.operation](input.params);
  });
```

## 📖 API Reference

### Core Methods
- `aui.tool(name)` - Create a new tool
- `aui.t(name)` - Shorthand for tool()
- `.input(schema)` - Define input with Zod schema
- `.execute(handler)` - Define server execution
- `.clientExecute(handler)` - Define client execution
- `.render(component)` - Define React rendering

### Helper Methods
- `aui.do(name, handler)` - One-liner tool
- `aui.simple(name, input, execute, render)` - Quick tool creation
- `aui.ai(name, config)` - AI-optimized with retry/cache
- `aui.defineTools(definitions)` - Batch definition

### Tool Methods
- `tool.run(input, ctx?)` - Execute the tool
- `tool.renderResult(data, input?)` - Render the result
- `tool.toDefinition()` - Export tool definition

### Registry Methods
- `aui.get(name)` - Get a registered tool
- `aui.register(tool)` - Register an external tool
- `aui.getTools()` - List all tools
- `aui.clear()` - Clear all tools

## 🏗️ Installation

The Lantos AUI is already integrated in this Next.js project:

```tsx
// Import from the library
import aui from '@/lib/aui/lantos-aui';
import { useAUITool } from '@/lib/aui/lantos-aui-hooks';

// Or use the examples
import { weatherTool, searchTool } from '@/lib/aui/lantos-aui-examples';
```

## 🧪 Testing

Run the test suite:

```bash
# Integration test
npx tsx test-lantos-aui.ts

# Jest unit tests
npm test -- --testPathPattern=lantos-aui
```

## 📝 Examples

Visit the demo page at `/lantos-aui-demo` to see all patterns in action.

## 🎯 Design Principles

1. **Simplicity First** - Minimal API surface, maximum capability
2. **No Build Step** - Tools work immediately after definition
3. **Type Safety** - Full TypeScript inference throughout
4. **AI-Friendly** - Designed for AI assistants to control applications
5. **Progressive Enhancement** - Start simple, add complexity as needed

## 🤝 Contributing

This is part of the Better UI project. The Lantos AUI implementation is located in:
- Core: `/lib/aui/lantos-aui.ts`
- Hooks: `/lib/aui/lantos-aui-hooks.tsx`
- Examples: `/lib/aui/lantos-aui-examples.tsx`
- Tests: `/lib/aui/__tests__/lantos-aui-complete.test.ts`

## 📄 License

MIT