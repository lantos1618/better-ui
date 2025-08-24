# Better UI - AUI (Assistant-UI) System

A concise and elegant tool system for Next.js that enables AI assistants to control both frontend and backend through a fluent API.

## 🚀 Quick Start

```tsx
// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Complex tool - adds client optimization
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
  .build();
```

## ✨ Features

- **Fluent API**: Chain methods for clean, readable tool definitions
- **Type Safety**: Full TypeScript support with Zod schemas
- **Minimal Boilerplate**: Only `input()` and `execute()` are required
- **Dual Execution**: Server-side execution with optional client-side optimization
- **React Integration**: Seamless rendering of tool results
- **AI-Ready**: Designed for AI assistants to control UI/backend

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  AUI System  │────▶│   Server    │
│  Component  │     │              │     │   Handler   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
  ToolRenderer     ClientExecutor         ToolExecutor
                    (optional)            (server-side)
```

## 📦 Installation

```bash
npm install
npm run dev
```

## 🛠️ API Reference

### Tool Builder

- `.tool(name)` - Create a new tool builder
- `.input(schema)` - Define input validation with Zod
- `.execute(handler)` - Server-side execution logic
- `.clientExecute(handler)` - Optional client-side execution
- `.render(component)` - React component for rendering results
- `.description(text)` - Optional tool description
- `.build()` - Build the final tool definition

### React Components

```tsx
import { ToolExecutorProvider, ToolRenderer, useToolExecutor } from '@/lib/aui/client';

// Provider setup
<ToolExecutorProvider tools={[weatherTool, searchTool]}>
  <App />
</ToolExecutorProvider>

// Render a tool result
<ToolRenderer toolCall={toolCall} tool={weatherTool} />

// Hook usage
const executor = useToolExecutor();
const result = await executor.execute(toolCall);
```

## 🔧 Usage Examples

### Basic Tool
```tsx
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    const response = await fetch(`/api/weather?city=${input.city}`);
    return response.json();
  })
  .render(({ data }) => (
    <div className="weather-card">
      <h3>{data.city}</h3>
      <p>{data.temp}°F</p>
    </div>
  ))
  .build();
```

### Tool with Client Optimization
```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    return await database.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching and offline support
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/aui', {
      method: 'POST',
      body: JSON.stringify({
        toolCall: { toolName: 'search', input }
      })
    });
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();
```

## 🗂️ Project Structure

```
better-ui/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   └── aui-demo/          # Demo pages
├── lib/aui/               # AUI system core
│   ├── core/              # Core builder and registry
│   ├── client/            # Client-side execution
│   ├── server/            # Server-side execution
│   ├── tools/             # Example tools
│   └── types/             # TypeScript definitions
├── examples/              # Usage examples
└── agent/                 # Development metadata
```

## 🧪 Testing

```bash
npm test
npm run type-check
npm run lint
```

## 🚀 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📚 Documentation

- [AUI System Overview](AUI.md) - Detailed system documentation
- [Examples](./examples/) - Complete usage examples
- [API Reference](./lib/aui/README.md) - Core API documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is private and proprietary.

---

Built with ❤️ using Next.js, TypeScript, and Zod.
