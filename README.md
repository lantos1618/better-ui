# Better UI

> Define once. Render in UI. Serve over MCP. Type-safe AI tools with views.

[![npm version](https://img.shields.io/npm/v/@lantos1618/better-ui.svg)](https://www.npmjs.com/package/@lantos1618/better-ui)
[![npm downloads](https://img.shields.io/npm/dm/@lantos1618/better-ui.svg)](https://www.npmjs.com/package/@lantos1618/better-ui)
[![CI](https://github.com/lantos1618/better-ui/actions/workflows/test.yml/badge.svg)](https://github.com/lantos1618/better-ui/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

**[Guide](./GUIDE.md)** · **[API Reference](./docs/)** · **[Examples](./examples/)**

## The Problem

Every AI framework lets you define tools. None of them let the tool own its own UI. You end up with tool definitions in one place, rendering logic scattered somewhere else, and no way to expose those same tools to external AI clients.

## The Solution

Better UI tools are self-contained units: **schema + server logic + view + streaming**, all in one definition. Use them in chat, call them from React, or expose them as an MCP server — same tool, zero glue code.

```typescript
import { tool } from '@lantos1618/better-ui';
import { z } from 'zod';

const weather = tool({
  name: 'weather',
  description: 'Get weather for a city',
  input: z.object({ city: z.string() }),
  output: z.object({ temp: z.number(), condition: z.string() }),
});

weather.server(async ({ city }) => {
  const data = await weatherAPI.get(city);
  return { temp: data.temp, condition: data.condition };
});

weather.view((data) => (
  <div className="weather-card">
    <span>{data.temp}°</span>
    <span>{data.condition}</span>
  </div>
));
```

That's it. The tool validates input/output with Zod, runs server logic securely, and renders its own results. Drop it into chat and it just works. Expose it over MCP and Claude Desktop can call it.

## Install

```bash
npm install @lantos1618/better-ui zod
```

## What You Get

| Feature | What |
|---------|------|
| **View integration** | Tools render their own results — no other framework does this |
| **MCP server** | Expose any tool registry to Claude Desktop, Cursor, VS Code |
| **AG-UI protocol** | Compatible with CopilotKit, LangChain, Google ADK frontends |
| **Multi-provider** | OpenAI, Anthropic, Google Gemini, OpenRouter |
| **Streaming views** | Progressive partial data rendering |
| **Drop-in chat** | `<Chat />` component with automatic tool view rendering |
| **HITL confirmation** | Tools can require human approval before executing |
| **Auth helpers** | JWT, session cookies, BetterAuth integration |
| **Security** | Context stripping, input validation, output sanitization, rate limiting |

## Quick Start

### 1. Define a Tool

```typescript
import { tool } from '@lantos1618/better-ui';
import { z } from 'zod';

export const search = tool({
  name: 'search',
  description: 'Search the web',
  input: z.object({ query: z.string().max(1000) }),
  output: z.object({
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
    })),
  }),
});

search.server(async ({ query }) => {
  const results = await searchAPI.search(query);
  return { results };
});

search.view((data) => (
  <ul>
    {data.results.map((r, i) => (
      <li key={i}><a href={r.url}>{r.title}</a></li>
    ))}
  </ul>
));
```

### 2. Use It in Chat

```tsx
import { Chat } from '@lantos1618/better-ui/components';

function App() {
  return (
    <Chat
      endpoint="/api/chat"
      tools={{ weather, search }}
      className="h-[600px]"
    />
  );
}
```

Tool results render automatically using the tool's `.view()` component.

### 3. Wire Up the API Route

```typescript
// app/api/chat/route.ts (Next.js)
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
      search: searchTool.toAITool(),
    },
  });
  return result.toUIMessageStreamResponse();
}
```

### 4. Or Expose as an MCP Server

```typescript
import { createMCPServer } from '@lantos1618/better-ui/mcp';

const server = createMCPServer({
  name: 'my-tools',
  version: '1.0.0',
  tools: { weather, search },
});

server.start(); // stdio transport — works with Claude Desktop
```

Add to Claude Desktop config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "my-tools": {
      "command": "npx",
      "args": ["tsx", "path/to/mcp-server.ts"]
    }
  }
}
```

Or use the HTTP handler for web-based MCP clients:

```typescript
// app/api/mcp/route.ts
export const POST = server.httpHandler();
```

---

## Tool API

### Object Config

```typescript
const myTool = tool({
  name: 'myTool',
  description: 'What this tool does',
  input: z.object({ query: z.string() }),
  output: z.object({ results: z.array(z.string()) }),
  tags: ['search'],
  cache: { ttl: 60000 },
  confirm: true,                    // require HITL confirmation
  hints: { destructive: true },     // behavioral metadata
  autoRespond: true,                // auto-send state back to AI after user action
  groupKey: (input) => input.query, // collapse related calls in thread
});
```

### Fluent Builder

```typescript
const search = tool('search')
  .description('Search the database')
  .input(z.object({ query: z.string() }))
  .output(z.object({ results: z.array(z.string()) }))
  .server(async ({ query }) => ({ results: await db.search(query) }))
  .view((data) => <ResultsList items={data.results} />)
  .build();
```

### Handlers

```typescript
// Server — runs in API routes, never on client
myTool.server(async (input, ctx) => {
  // ctx.env, ctx.headers, ctx.cookies, ctx.user, ctx.session
  return await db.query(input.query);
});

// Client — runs in browser. Auto-fetches to /api/tools/execute if not defined
myTool.client(async (input, ctx) => {
  return ctx.fetch('/api/search', { method: 'POST', body: JSON.stringify(input) });
});

// Stream — progressive partial updates
myTool.stream(async (input, { stream }) => {
  stream({ status: 'searching...' });
  const results = await search(input.query);
  stream({ results, status: 'done' });
  return { results, status: 'done', count: results.length };
});

// View — render results (the differentiator)
myTool.view((data, { loading, error, streaming, onAction }) => {
  if (loading) return <Spinner />;
  if (error) return <ErrorCard message={error.message} />;
  if (streaming) return <PartialResults data={data} />;
  return <Results items={data.results} />;
});
```

### Execution

```typescript
// Server-side
const result = await myTool.run(input, { isServer: true });

// Client-side (auto-fetches if no .client() defined)
const result = await myTool.run(input, { isServer: false });

// Streaming
for await (const { partial, done } of myTool.runStream(input)) {
  console.log(partial); // progressive updates
  if (done) break;
}

// AI SDK integration
const aiTool = myTool.toAITool(); // { description, inputSchema, execute }
```

---

## React Hooks

```typescript
import { useTool, useTools, useToolStream } from '@lantos1618/better-ui/react';
```

### `useTool`

```typescript
const { data, loading, error, execute, reset, executed } = useTool(myTool, initialInput, {
  auto: false,
  onSuccess: (data) => {},
  onError: (error) => {},
});
```

### `useToolStream`

```typescript
const { data, finalData, streaming, loading, error, execute, reset } = useToolStream(myTool);
```

### `useTools`

```typescript
const tools = useTools({ weather, search });

await tools.weather.execute({ city: 'London' });
tools.weather.data;    // result
tools.search.loading;  // loading state
```

---

## Chat Components

```typescript
import { Chat, ChatProvider, Thread, Composer, Message, ToolResult } from '@lantos1618/better-ui/components';
```

### Drop-in

```tsx
<Chat endpoint="/api/chat" tools={{ weather, search }} className="h-[600px]" />
```

### Composable

```tsx
<ChatProvider endpoint="/api/chat" tools={tools}>
  <div className="flex flex-col h-screen">
    <Thread className="flex-1 overflow-y-auto" />
    <Composer placeholder="Type a message..." />
  </div>
</ChatProvider>
```

### All Components

| Component | Description |
|-----------|-------------|
| `Chat` | All-in-one (ChatProvider + Thread + Composer) |
| `ChatProvider` | Context provider wrapping AI SDK's `useChat` |
| `Thread` | Message list with auto-scroll |
| `Message` | Single message with tool view rendering |
| `Composer` | Input form with send button |
| `ToolResult` | Renders a tool's `.view()` in chat context |
| `Panel` / `ChatPanel` | Sidebar panel for thread management |
| `Markdown` | Markdown renderer with syntax highlighting |
| `ThemeProvider` | Theme CSS variable provider |

### View Building Blocks

Pre-made view components for common patterns:

```typescript
import {
  QuestionView,    // Multiple choice / free-text questions
  FormView,        // Dynamic forms
  DataTableView,   // Sortable data tables
  ProgressView,    // Step-by-step progress
  MediaDisplayView,// Image/video display
  CodeBlockView,   // Syntax-highlighted code
  FileUploadView,  // File upload UI
} from '@lantos1618/better-ui/components';
```

---

## MCP Server

Turn any tool registry into an [MCP](https://modelcontextprotocol.io) server. Zero dependencies beyond Better UI itself.

```typescript
import { createMCPServer } from '@lantos1618/better-ui/mcp';

const server = createMCPServer({
  name: 'my-app',
  version: '1.0.0',
  tools: { weather, search, calculator },
  context: { env: process.env },  // passed to every tool execution
});
```

### Transports

```typescript
// stdio — for Claude Desktop, Cursor, VS Code extensions
server.start();

// HTTP — for Next.js, Express, Cloudflare Workers, Deno
const handler = server.httpHandler();
// Use as: export const POST = handler;
```

### Programmatic Use

```typescript
// List tools with JSON schemas
const tools = server.listTools();

// Call a tool directly
const result = await server.callTool('weather', { city: 'Tokyo' });
// → { content: [{ type: 'text', text: '{"temp":21,"city":"Tokyo","condition":"sunny"}' }] }

// Handle raw JSON-RPC messages
const response = await server.handleMessage({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name: 'weather', arguments: { city: 'Tokyo' } },
});
```

### Schema Conversion

The built-in `zodToJsonSchema` converter handles common Zod types without extra dependencies:

```typescript
import { zodToJsonSchema } from '@lantos1618/better-ui/mcp';

zodToJsonSchema(z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(0),
  role: z.enum(['admin', 'user']),
}));
// → { type: 'object', properties: { name: { type: 'string', ... }, ... }, required: [...] }
```

---

## AG-UI Protocol

Expose your tools via the [AG-UI (Agent-User Interaction Protocol)](https://docs.ag-ui.com) — compatible with CopilotKit, LangChain, Google ADK, and any AG-UI frontend.

```typescript
import { createAGUIServer } from '@lantos1618/better-ui/agui';

const server = createAGUIServer({
  name: 'my-tools',
  tools: { weather, search },
});

// Next.js route handler — returns SSE event stream
export const POST = server.handler();
```

The handler emits standard AG-UI events (`RUN_STARTED`, `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `TOOL_CALL_RESULT`, `TOOL_CALL_END`, `RUN_FINISHED`) over Server-Sent Events.

---

## Providers

```typescript
import { createProvider } from '@lantos1618/better-ui';

createProvider({ provider: 'openai', model: 'gpt-4o' });
createProvider({ provider: 'anthropic', model: 'claude-4-sonnet' });
createProvider({ provider: 'google', model: 'gemini-2.5-pro' });
createProvider({ provider: 'openrouter', model: 'anthropic/claude-4-sonnet', apiKey: '...' });
```

| Provider | Package | Example Models |
|----------|---------|----------------|
| OpenAI | `@ai-sdk/openai` (included) | `gpt-4o`, `gpt-5.2` |
| Anthropic | `@ai-sdk/anthropic` (optional) | `claude-4-sonnet`, `claude-4-opus` |
| Google | `@ai-sdk/google` (optional) | `gemini-2.5-pro` |
| OpenRouter | `@ai-sdk/openai` (included) | any model via `provider/model` |

---

## Auth

```typescript
import { jwtAuth, sessionAuth, betterAuth } from '@lantos1618/better-ui/auth';

// JWT Bearer tokens
const auth = jwtAuth({ secret: process.env.JWT_SECRET!, issuer: 'my-app' });

// Cookie-based sessions
const auth = sessionAuth({ cookieName: 'session', verify: async (token) => db.getSession(token) });

// BetterAuth integration
const auth = betterAuth(authInstance);
```

---

## Persistence

```typescript
import { createMemoryAdapter } from '@lantos1618/better-ui/persistence';

const adapter = createMemoryAdapter(); // in-memory, for dev/testing

await adapter.createThread('New Chat');
await adapter.saveMessages(threadId, messages);
await adapter.getMessages(threadId);
```

Implement the `PersistenceAdapter` interface for Drizzle, Prisma, or any database.

---

## HITL (Human-in-the-Loop)

Tools can require confirmation before executing:

```typescript
const sendEmail = tool({
  name: 'sendEmail',
  description: 'Send an email',
  input: z.object({ to: z.string().email(), subject: z.string(), body: z.string() }),
  confirm: true, // always require confirmation
  // or: confirm: (input) => input.to.endsWith('@company.com') // conditional
  // or: hints: { destructive: true } // auto-implies confirmation
});
```

When `confirm` is set, `toAITool()` omits the `execute` function, leaving the tool call at `state: 'input-available'` for client-side confirmation before execution.

---

## Security

Better UI is designed with security boundaries between server and client:

- **Context stripping** — `env`, `headers`, `cookies`, `user`, `session` are automatically removed when running on the client
- **Input validation** — Zod schemas validate and strip unknown keys before execution
- **Output validation** — Output schemas prevent accidental data leakage (extra fields are stripped)
- **Server isolation** — Server handlers never run on the client; auto-fetch kicks in instead
- **Serialization safety** — `toJSON()` excludes handlers, schemas, and internal config
- **Rate limiting** — Pluggable rate limiter with in-memory and Redis backends
- **Audit logging** — Structured JSON logging for every tool execution
- **Prototype pollution protection** — Safe object merging in state context handling
- **MCP hardening** — `hasOwnProperty` checks prevent prototype chain traversal on tool lookup

---

## Project Structure

```
src/
  tool.tsx              Core tool() API — schema, handlers, view, streaming
  index.ts              Main exports (server-safe, no React)
  react/
    useTool.ts           useTool, useTools hooks
    useToolStream.ts     useToolStream hook
  components/
    Chat.tsx             All-in-one chat
    ChatProvider.tsx      Chat context provider
    Thread.tsx           Message list
    Message.tsx          Single message
    Composer.tsx         Input form
    ToolResult.tsx       Tool view renderer
    Panel.tsx            Sidebar panel
    Markdown.tsx         Markdown renderer
    Question.tsx         Question view block
    Form.tsx             Form view block
    DataTable.tsx        Data table view block
    Progress.tsx         Progress view block
    MediaDisplay.tsx     Media view block
    CodeBlock.tsx        Code block view block
    FileUpload.tsx       File upload view block
    Toast.tsx            Toast notifications
    ThemeProvider.tsx     Theme CSS variables
  providers/
    openai.ts            OpenAI adapter
    anthropic.ts         Anthropic adapter
    google.ts            Google Gemini adapter
    openrouter.ts        OpenRouter adapter
  auth/
    jwt.ts               JWT auth helper
    session.ts           Session cookie auth
    better-auth.ts       BetterAuth integration
  persistence/
    types.ts             PersistenceAdapter interface
    memory.ts            In-memory adapter
  mcp/
    server.ts            MCP server (stdio + HTTP + SSE)
    schema.ts            Zod → JSON Schema converter
  agui/
    server.ts            AG-UI protocol server (SSE)
examples/
  nextjs-demo/           Full Next.js demo app
  vite-demo/             Vite + Express demo app
  mcp-server/            Standalone MCP server example
```

## Development

```bash
npm install
npm run build        # Build library
npm test             # Run 228 tests across 11 suites
npm run type-check   # TypeScript check
```

## Deploy the Demo

The `examples/nextjs-demo/` is a full-featured chat app ready to deploy:

```bash
cd examples/nextjs-demo
npm install
# Set OPENAI_API_KEY in .env.local
npm run dev
```

To deploy on Vercel, set the **Root Directory** to `examples/nextjs-demo` in your project settings.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
