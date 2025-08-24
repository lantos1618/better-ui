# 🚀 Lantos Ultra-Concise AUI (Assistant-UI) API

The most elegant way to create AI-powered tools for Next.js/Vercel applications.

## ✨ Key Features

- **No `.build()` required** - Tools auto-finalize when complete
- **Ultra-concise** - Simple tools need just 2 methods
- **Type-safe** - Full TypeScript and Zod support
- **Flexible** - Server and client execution paths
- **Smart** - Automatic parameter detection
- **React-ready** - Built-in component rendering

## 📦 Installation

```typescript
import aui from 'lib/aui/lantos-aui';
import { z } from 'zod';
```

## 🎯 Quick Start

### Simple Tool (2 methods only!)

```tsx
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);
```

### Complex Tool with Client Optimization

```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);
```

## 🛠️ API Patterns

### 1️⃣ Simple Pattern
```tsx
aui.tool('name')
  .input(schema)           // Zod validation
  .execute(handler)        // Server execution
  .render(component)       // React rendering
```

### 2️⃣ Complex Pattern
```tsx
aui.tool('name')
  .input(schema)
  .execute(serverHandler)
  .clientExecute(clientHandler)  // Optional client-side optimization
  .render(component)
```

### 3️⃣ Minimal Pattern
```tsx
aui.tool('name')
  .execute(async (input: Type) => result)  // Type inference
  .render(({ data }) => <div>{data}</div>)
```

### 4️⃣ Ultra-Short Pattern
```tsx
aui.t('name')  // Short alias for .tool()
  .execute(handler)
  .render(component)
```

## 🎨 Real-World Examples

### Weather Tool
```tsx
const weather = aui
  .tool('weather')
  .input(z.object({ 
    city: z.string(),
    units: z.enum(['celsius', 'fahrenheit']).optional() 
  }))
  .execute(async ({ input }) => {
    const temp = await weatherAPI.getTemp(input.city);
    return { 
      temp: input.units === 'celsius' ? toCelsius(temp) : temp,
      city: input.city,
      units: input.units || 'fahrenheit'
    };
  })
  .render(({ data }) => (
    <WeatherCard 
      city={data.city} 
      temp={data.temp} 
      units={data.units} 
    />
  ));
```

### Database Tool
```tsx
const database = aui
  .tool('database')
  .input(z.object({
    table: z.string(),
    operation: z.enum(['select', 'insert', 'update', 'delete']),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    switch(input.operation) {
      case 'select':
        return await db.select(input.table);
      case 'insert':
        return await db.insert(input.table, input.data);
      // ... other operations
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Use IndexedDB for offline support
    if (!navigator.onLine) {
      return ctx.localDB.execute(input);
    }
    return ctx.fetch('/api/db', { body: input });
  })
  .render(({ data }) => <DatabaseResult data={data} />);
```

### Chat Tool with Streaming
```tsx
const chat = aui
  .tool('chat')
  .input(z.object({ 
    message: z.string(),
    stream: z.boolean().optional() 
  }))
  .execute(async function* ({ input }) {
    if (input.stream) {
      // Generator for streaming responses
      for await (const chunk of chatAPI.stream(input.message)) {
        yield chunk;
      }
    } else {
      return await chatAPI.complete(input.message);
    }
  })
  .render(({ data }) => <ChatMessage content={data} />);
```

## 🔧 Context API

The context object provides utilities for client-side execution:

```tsx
interface ToolContext {
  cache: Map<string, any>;        // Client-side cache
  fetch: (url: string, options?: RequestInit) => Promise<any>;
  userId?: string;                 // Current user ID
  sessionId?: string;              // Session identifier
  [key: string]: any;             // Custom context properties
}
```

## 🧪 Testing

```typescript
import { render } from '@testing-library/react';
import aui from 'lib/aui/lantos-aui';

describe('My Tool', () => {
  const tool = aui
    .tool('test')
    .input(z.object({ value: z.number() }))
    .execute(async ({ input }) => input.value * 2)
    .render(({ data }) => <div>{data}</div>);

  it('should execute correctly', async () => {
    const result = await tool.execute({ input: { value: 21 } });
    expect(result).toBe(42);
  });

  it('should render correctly', () => {
    const { getByText } = render(
      tool.render({ data: 42, input: { value: 21 } })
    );
    expect(getByText('42')).toBeInTheDocument();
  });
});
```

## 🎯 Benefits Over Traditional APIs

### Before (Traditional)
```tsx
const tool = new ToolBuilder('weather')
  .setInputSchema(schema)
  .setExecutor(handler)
  .setRenderer(component)
  .build();  // ❌ Extra step required
```

### After (Lantos AUI)
```tsx
const tool = aui
  .tool('weather')
  .input(schema)
  .execute(handler)
  .render(component);  // ✅ No .build() needed!
```

## 🚀 Advanced Features

- **Auto-registration**: Tools automatically register with global registry
- **Smart detection**: Automatically detects parameter styles
- **Type inference**: Infers types when possible
- **Proxy-based**: Uses JavaScript Proxy for auto-finalization
- **Flexible rendering**: Support for both simple and complex render props

## 📚 Full API Reference

```typescript
// Create a tool
aui.tool(name: string)
aui.t(name: string)  // Short alias

// Configure input
.input(schema: ZodType)

// Set execution
.execute(handler: Function)
.clientExecute(handler: Function)  // Optional

// Set rendering
.render(component: Function)

// Tool is auto-finalized and ready to use!
```

## 🎉 Summary

The Lantos Ultra-Concise AUI API makes creating AI-powered tools incredibly simple:

1. **Simple tools**: 2 methods (execute + render)
2. **Complex tools**: Add clientExecute for optimization
3. **No build step**: Tools auto-finalize
4. **Type-safe**: Full TypeScript support
5. **React-ready**: Built-in component rendering

Start building powerful AI tools with minimal code today!