# Better UI

> A minimal, type-safe AI-first UI framework for building tools

[![npm version](https://img.shields.io/npm/v/@lantos1618/better-ui.svg)](https://www.npmjs.com/package/@lantos1618/better-ui)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## What is Better UI?

Better UI provides a clean, fluent API for creating tools that AI assistants can execute. Define input/output schemas with Zod, implement server and client logic separately, and render results with React components.

**Key differentiators**:
- **View integration** - tools render their own results in UI (no other framework does this)
- **Multi-provider support** - OpenAI, Anthropic, Google Gemini, OpenRouter
- **Streaming tool views** - progressive partial data rendering
- **Pre-made chat components** - drop-in `<Chat />` with automatic tool view rendering
- **Server infrastructure** - rate limiting, caching, Next.js/Express adapters

## Installation

```bash
npm install @lantos1618/better-ui zod
```

## Quick Start

```typescript
import { tool } from '@lantos1618/better-ui';
import { z } from 'zod';

const weather = tool({
  name: 'weather',
  description: 'Get weather for a city',
  input: z.object({ city: z.string() }),
  output: z.object({ temp: z.number(), condition: z.string() }),
});

// Server implementation (runs on server)
weather.server(async ({ city }) => {
  const data = await weatherAPI.get(city);
  return { temp: data.temp, condition: data.condition };
});

// View for rendering results (our differentiator!)
weather.view((data) => (
  <div className="weather-card">
    <span>{data.temp}</span>
    <span>{data.condition}</span>
  </div>
));
```

## Drop-in Chat UI

```tsx
import { Chat } from '@lantos1618/better-ui/components';

function App() {
  return (
    <Chat
      endpoint="/api/chat"
      tools={{ weather, search, counter }}
      className="h-[600px]"
      placeholder="Ask something..."
    />
  );
}
```

Or compose your own layout:

```tsx
import { ChatProvider, Thread, Composer } from '@lantos1618/better-ui/components';

function App() {
  return (
    <ChatProvider endpoint="/api/chat" tools={tools}>
      <div className="flex flex-col h-screen">
        <Thread className="flex-1 overflow-y-auto" />
        <Composer placeholder="Type a message..." />
      </div>
    </ChatProvider>
  );
}
```

Tool results in chat automatically render using the tool's `.view()` component.

## Multi-Provider Support

```typescript
import { createProvider } from '@lantos1618/better-ui';

// OpenAI
const provider = createProvider({ provider: 'openai', model: 'gpt-4o' });

// Anthropic
const provider = createProvider({ provider: 'anthropic', model: 'claude-4-sonnet' });

// Google Gemini
const provider = createProvider({ provider: 'google', model: 'gemini-2.5-pro' });

// OpenRouter (access any model)
const provider = createProvider({
  provider: 'openrouter',
  model: 'anthropic/claude-4-sonnet',
  apiKey: process.env.OPENROUTER_API_KEY,
});
```

Use with the chat handler:

```typescript
import { streamText, convertToModelMessages } from 'ai';
import { createProvider } from '@lantos1618/better-ui';

const provider = createProvider({ provider: 'openai', model: 'gpt-4o' });

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: provider.model(),
    messages: convertToModelMessages(messages),
    tools: {
      weather: weatherTool.toAITool(),
    },
  });
  return result.toUIMessageStreamResponse();
}
```

## Streaming Tool Views

Tools can stream partial results progressively:

```typescript
import { useToolStream } from '@lantos1618/better-ui';

// Define a streaming tool
const analysis = tool({
  name: 'analysis',
  input: z.object({ query: z.string() }),
  output: z.object({ summary: z.string(), score: z.number() }),
});

analysis.stream(async ({ query }, { stream }) => {
  stream({ summary: 'Analyzing...' });       // Partial update
  const result = await analyzeData(query);
  stream({ summary: result.summary });        // More data
  return { summary: result.summary, score: result.score }; // Final
});

// In a component:
function AnalysisWidget({ query }) {
  const { data, streaming, loading, execute } = useToolStream(analysis);

  return (
    <div>
      <button onClick={() => execute({ query })}>Analyze</button>
      {loading && <p>Starting...</p>}
      {streaming && <p>Streaming: {data?.summary}</p>}
      {data?.score && <p>Score: {data.score}</p>}
    </div>
  );
}
```

## Core Concepts

### 1. Tool Definition

```typescript
const myTool = tool({
  name: 'myTool',
  description: 'What this tool does',
  input: z.object({ /* input schema */ }),
  output: z.object({ /* output schema */ }),
  tags: ['category', 'type'],
  cache: { ttl: 60000 }, // optional caching
});
```

### 2. Server Implementation

The `.server()` method defines logic that runs on the server (API routes, server components):

```typescript
myTool.server(async ({ query }, ctx) => {
  // Direct access to databases, secrets, file system
  const results = await db.search(query);
  return { results };
});
```

### 3. Client Implementation (Optional)

The `.client()` method defines what happens when called from the browser. If not specified, auto-fetches to `/api/tools/execute`.

```typescript
myTool.client(async ({ query }, ctx) => {
  const cached = ctx.cache.get(query);
  if (cached) return cached;

  return ctx.fetch('/api/search', {
    method: 'POST',
    body: JSON.stringify({ query })
  });
});
```

### 4. View (Our Differentiator)

The `.view()` method defines how to render the tool's results:

```typescript
myTool.view((data, { loading, error, streaming }) => {
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (streaming) return <PartialResults data={data} />;
  return <Results items={data.results} />;
});
```

### 5. Streaming

The `.stream()` method enables progressive partial updates:

```typescript
myTool.stream(async ({ query }, { stream }) => {
  stream({ status: 'searching...' });
  const results = await search(query);
  stream({ results, status: 'done' });
  return { results, status: 'done', count: results.length };
});
```

## Fluent Builder Alternative

```typescript
const search = tool('search')
  .description('Search the database')
  .input(z.object({ query: z.string() }))
  .output(z.object({ results: z.array(z.string()) }))
  .server(async ({ query }) => ({ results: await db.search(query) }))
  .stream(async ({ query }, { stream }) => {
    stream({ results: [] });
    const results = await db.search(query);
    return { results };
  })
  .view((data) => <ResultsList items={data.results} />);
```

## React Hooks

### `useTool(tool, input?, options?)`

```typescript
import { useTool } from '@lantos1618/better-ui';

const {
  data,      // Result data
  loading,   // Loading state
  error,     // Error if any
  execute,   // Execute function
  reset,     // Reset state
  executed,  // Has been executed
} = useTool(myTool, initialInput, {
  auto: false,
  onSuccess: (data) => {},
  onError: (error) => {},
});
```

### `useToolStream(tool, options?)`

```typescript
import { useToolStream } from '@lantos1618/better-ui';

const {
  data,       // Progressive partial data
  finalData,  // Complete validated data (when done)
  streaming,  // True while receiving partial updates
  loading,    // True before first chunk
  error,
  execute,
  reset,
} = useToolStream(myTool);
```

### `useTools(tools, options?)`

```typescript
import { useTools } from '@lantos1618/better-ui';

const tools = useTools({ weather, search });

await tools.weather.execute({ city: 'London' });
await tools.search.execute({ query: 'restaurants' });

tools.weather.data;    // Weather result
tools.search.loading;  // Search loading state
```

## Chat Components

Import from `@lantos1618/better-ui/components`:

| Component | Description |
|-----------|-------------|
| `Chat` | All-in-one chat component (ChatProvider + Thread + Composer) |
| `ChatProvider` | Context provider wrapping AI SDK's `useChat` |
| `Thread` | Message list with auto-scroll |
| `Message` | Single message with automatic tool view rendering |
| `Composer` | Input form with send button |
| `ToolResult` | Renders a tool's `.View` in chat context |

All components accept `className` for styling customization.

## Providers

| Provider | Package Required | Example Model |
|----------|-----------------|---------------|
| OpenAI | `@ai-sdk/openai` (included) | `gpt-4o`, `gpt-5.2` |
| Anthropic | `@ai-sdk/anthropic` (optional) | `claude-4-sonnet` |
| Google | `@ai-sdk/google` (optional) | `gemini-2.5-pro` |
| OpenRouter | `@ai-sdk/openai` (included) | `anthropic/claude-4-sonnet` |

```bash
# Optional providers
npm install @ai-sdk/anthropic  # For Anthropic
npm install @ai-sdk/google     # For Google Gemini
```

## Project Structure

```
src/
  tool.tsx            # Core tool() API with streaming
  react/
    useTool.ts        # React hooks (useTool, useTools)
    useToolStream.ts  # Streaming hook
  components/
    Chat.tsx          # All-in-one chat component
    ChatProvider.tsx   # Chat context provider
    Thread.tsx        # Message list
    Message.tsx       # Single message
    Composer.tsx      # Input form
    ToolResult.tsx    # Tool view renderer
  providers/
    openai.ts         # OpenAI adapter
    anthropic.ts      # Anthropic adapter
    google.ts         # Google Gemini adapter
    openrouter.ts     # OpenRouter adapter
  adapters/
    nextjs.ts         # Next.js route handlers
    express.ts        # Express middleware
  index.ts            # Main exports
```

## Development

```bash
npm install
npm run dev          # Run dev server
npm run build:lib    # Build library
npm run build        # Build everything
npm run type-check   # TypeScript check
npm test             # Run tests
```

## License

MIT
