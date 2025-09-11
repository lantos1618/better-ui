# Better UI - AUI (Assistant-UI) System

> A powerful, type-safe tool system for Next.js that enables AI assistants to control both frontend and backend operations through a fluent API.

[![npm version](https://img.shields.io/npm/v/@lantos1618/better-ui.svg)](https://www.npmjs.com/package/@lantos1618/better-ui)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)

## 🎯 What is Better UI?

Better UI is an **AI-first UI framework** that revolutionizes how AI assistants interact with web applications. It provides a clean, type-safe abstraction layer that allows AI models to execute both frontend and backend operations seamlessly.

### Key Benefits

- **🚀 Minimal Boilerplate**: Create powerful tools with just 2 required methods
- **🔒 Type Safety**: Full TypeScript + Zod schema validation
- **🎨 AI-Native**: Built specifically for AI assistants to control applications
- **⚡ Performance**: Smart client-side caching and optimization
- **🔧 Extensible**: Easy to create custom tools for any use case

## 📦 Installation

```bash
npm install @lantos1618/better-ui
# or
yarn add @lantos1618/better-ui
# or
bun add @lantos1618/better-ui
```

## 🚀 Quick Start

### 1. Simple Tool (2 methods only!)

```tsx
import { aui } from '@lantos1618/better-ui';
import { z } from 'zod';

const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);
```

### 2. Advanced Tool with Client Optimization

```tsx
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Optional: Add caching, offline support, optimistic updates
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);
```

## 💻 AI SDK Integration (Vercel AI SDK)

Better UI seamlessly integrates with Vercel's AI SDK for building chat interfaces:

### Basic Chat Integration

```tsx
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText, convertToCoreMessages } from 'ai';
import { aui } from '@lantos1618/better-ui';
import { z } from 'zod';

// Define your tools
const weatherTool = aui
  .tool('getWeather')
  .description('Get current weather for a city')
  .input(z.object({ 
    city: z.string().describe('City name'),
    unit: z.enum(['celsius', 'fahrenheit']).optional() 
  }))
  .execute(async ({ input }) => {
    // Fetch real weather data
    const response = await fetch(`https://api.weather.com/v1/weather?city=${input.city}`);
    return response.json();
  });

const stockTool = aui
  .tool('getStockPrice')
  .description('Get current stock price')
  .input(z.object({ 
    symbol: z.string().describe('Stock symbol (e.g., AAPL)') 
  }))
  .execute(async ({ input }) => {
    const response = await fetch(`https://api.stocks.com/v1/quote/${input.symbol}`);
    return response.json();
  });

// Convert to AI SDK format
const tools = {
  getWeather: weatherTool.toAISDKTool(),
  getStockPrice: stockTool.toAISDKTool(),
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4'),
    messages: convertToCoreMessages(messages),
    tools,
    maxToolRoundtrips: 5,
  });

  return result.toDataStreamResponse();
}
```

### React Chat Component

```tsx
// app/chat/page.tsx
'use client';

import { useChat } from 'ai/react';
import { ToolExecutorProvider, ToolRenderer } from '@lantos1618/better-ui/client';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <ToolExecutorProvider tools={[weatherTool, stockTool]}>
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message) => (
            <div key={message.id} className="mb-4">
              <div className="font-bold">{message.role}:</div>
              <div>{message.content}</div>
              
              {/* Render tool calls with Better UI */}
              {message.toolInvocations?.map((toolCall) => (
                <ToolRenderer 
                  key={toolCall.toolCallId}
                  toolCall={toolCall}
                  tool={tools[toolCall.toolName]}
                />
              ))}
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about weather or stocks..."
            className="w-full p-2 border rounded"
          />
        </form>
      </div>
    </ToolExecutorProvider>
  );
}
```

### Advanced Chat with Multiple Tools

```tsx
// lib/ai-tools.ts
import { aui } from '@lantos1618/better-ui';
import { z } from 'zod';

// Database search tool
export const searchDatabaseTool = aui
  .tool('searchDatabase')
  .description('Search internal database')
  .input(z.object({
    query: z.string(),
    filters: z.object({
      category: z.string().optional(),
      dateRange: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }).optional(),
    }).optional(),
  }))
  .execute(async ({ input }) => {
    // Your database logic
    return await db.search(input.query, input.filters);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching
    const cacheKey = JSON.stringify(input);
    const cached = ctx.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
    
    const result = await ctx.fetch('/api/search', { 
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    ctx.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  })
  .render(({ data }) => (
    <div className="grid gap-2">
      {data.results.map((item) => (
        <div key={item.id} className="p-2 border rounded">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  ));

// Chart generation tool
export const createChartTool = aui
  .tool('createChart')
  .description('Generate interactive charts')
  .input(z.object({
    type: z.enum(['line', 'bar', 'pie', 'scatter']),
    data: z.array(z.object({
      label: z.string(),
      value: z.number(),
    })),
    title: z.string().optional(),
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => (
    <ChartComponent type={data.type} data={data.data} title={data.title} />
  ));

// Form generation tool
export const generateFormTool = aui
  .tool('generateForm')
  .description('Create dynamic forms')
  .input(z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'email', 'select', 'checkbox']),
      label: z.string(),
      required: z.boolean().optional(),
      options: z.array(z.string()).optional(),
    })),
    submitUrl: z.string(),
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => (
    <DynamicForm fields={data.fields} submitUrl={data.submitUrl} />
  ));
```

### Streaming with Tool Results

```tsx
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4'),
    messages,
    tools: {
      searchDatabase: searchDatabaseTool.toAISDKTool(),
      createChart: createChartTool.toAISDKTool(),
      generateForm: generateFormTool.toAISDKTool(),
    },
    toolChoice: 'auto', // Let AI decide when to use tools
    async onToolCall({ toolCall, toolResult }) {
      // Log tool usage for analytics
      console.log(`Tool ${toolCall.toolName} called with:`, toolCall.args);
      console.log(`Result:`, toolResult);
    },
  });

  return result.toDataStreamResponse();
}
```

## 🛠️ Pre-built Tools

Better UI comes with a comprehensive set of pre-built tools:

### DOM Manipulation Tools
- `clickTool` - Click elements on the page
- `typeTool` - Type text into inputs
- `scrollTool` - Scroll to elements
- `selectTool` - Select dropdown options

### API Tools
- `fetchTool` - Make HTTP requests
- `graphqlTool` - Execute GraphQL queries

### Form Tools
- `formGeneratorTool` - Create dynamic forms
- `formValidatorTool` - Validate form data

### Data Tools
- `databaseQueryTool` - Query databases
- `dataTransformTool` - Transform data structures

### State Management
- `stateManagerTool` - Manage application state
- `localStorageTool` - Persist data locally

## 📚 Full API Reference

### Core Builder Methods

```typescript
aui
  .tool(name: string)                    // Create tool with name
  .description(text: string)              // Add description (for AI)
  .tags(...tags: string[])               // Add tags for discovery
  .input(schema: ZodSchema)              // Input validation schema
  .execute(handler: ExecuteHandler)      // Server-side logic (required)
  .clientExecute(handler: ClientHandler) // Client-side logic (optional)
  .render(component: RenderFunction)     // React component (optional)
  .stream(handler: StreamHandler)        // Streaming support (optional)
```

### React Hooks & Components

```tsx
// Provider for tool execution
<ToolExecutorProvider tools={tools}>
  <App />
</ToolExecutorProvider>

// Render tool results
<ToolRenderer toolCall={toolCall} tool={tool} />

// Hook for manual execution
const executor = useToolExecutor();
const result = await executor.execute(toolCall);

// Hook for tool discovery
const tools = useToolRegistry();
const weatherTools = tools.getByTag('weather');
```

### AI Assistant Integration

```typescript
import { createAIAssistant } from '@lantos1618/better-ui';

const assistant = createAIAssistant({
  model: 'gpt-4',
  tools: [weatherTool, searchTool],
  systemPrompt: 'You are a helpful assistant.',
});

const response = await assistant.chat('What\'s the weather in NYC?');
```

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   AI Model   │────▶│  AUI System  │────▶│   Your App   │
│  (GPT, etc)  │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
  Tool Calls         Tool Registry         Tool Execution
                    Type Validation         React Rendering
                   Client/Server Split      State Management
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚀 Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy with environment variables
vercel --env API_KEY=xxx
```

### Environment Variables

```env
# Required for AI features
OPENAI_API_KEY=your_api_key

# Optional
DATABASE_URL=your_db_url
REDIS_URL=your_redis_url
```

## 📖 Examples

Check out our example applications:

- [Chat Application](./examples/chat-app) - Full chat UI with tool execution
- [Dashboard](./examples/dashboard) - Analytics dashboard with AI controls
- [Form Builder](./examples/form-builder) - Dynamic form generation
- [Data Explorer](./examples/data-explorer) - Database exploration tool

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - The React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Zod](https://zod.dev/) - Schema validation
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI integration

## 📞 Support

- [GitHub Issues](https://github.com/lantos1618/better-ui/issues)
- [Documentation](https://docs.better-ui.dev)
- Email: support@better-ui.dev

---

Built with ❤️ by the Better UI team