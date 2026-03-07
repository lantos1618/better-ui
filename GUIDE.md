# Better UI — Complete Usage Guide

> Define once. Render in UI. Serve over MCP. Type-safe AI tools with views.

## Table of Contents

- [Install](#install)
- [Core Concept](#core-concept)
- [1. Define a Tool](#1-define-a-tool)
- [2. Add a View](#2-add-a-view)
- [3. Wire Up the API Route](#3-wire-up-the-api-route)
- [4. Build the Chat UI](#4-build-the-chat-ui)
- [5. Human-in-the-Loop (HITL)](#5-human-in-the-loop-hitl)
- [6. Streaming Views](#6-streaming-views)
- [7. React Hooks (Outside Chat)](#7-react-hooks-outside-chat)
- [8. Built-in View Components](#8-built-in-view-components)
- [9. Persistence](#9-persistence)
- [10. MCP Server](#10-mcp-server)
- [11. AG-UI Protocol](#11-ag-ui-protocol)
- [12. Authentication](#12-authentication)
- [13. Fluent Builder API](#13-fluent-builder-api)
- [14. Multi-Provider Setup](#14-multi-provider-setup)
- [Full Example: From Zero to Chat](#full-example-from-zero-to-chat)

---

## Install

```bash
npm install @lantos1618/better-ui zod ai @ai-sdk/openai
```

## Core Concept

In every other AI framework, tool definitions live in one place and rendering logic lives somewhere else. Better UI makes the tool **own** its own UI:

```
tool = schema + server logic + view
```

When the AI calls a tool, its `.view()` renders automatically in the chat. No switch statements, no manual mapping.

---

## 1. Define a Tool

```tsx
import { tool } from '@lantos1618/better-ui';
import { z } from 'zod';

export const weatherTool = tool({
  name: 'weather',
  description: 'Get current weather for a city',
  input: z.object({ city: z.string() }),
  output: z.object({
    temp: z.number(),
    city: z.string(),
    condition: z.string(),
  }),
});
```

### Add Server Logic

Server handlers run **only on the server** — they never execute in the browser. This is where you put database queries, API calls, and anything that touches secrets.

```tsx
weatherTool.server(async ({ city }, ctx) => {
  // ctx.env, ctx.headers, ctx.user — available here, stripped on client
  const data = await fetch(`https://api.weather.com/${city}`);
  return { temp: data.temp, city, condition: data.condition };
});
```

### Add Client Logic (Optional)

If you need custom client-side behavior. If omitted, the client auto-fetches to `/api/tools/execute`.

```tsx
weatherTool.client(async ({ city }, ctx) => {
  const res = await ctx.fetch('/api/weather', {
    method: 'POST',
    body: JSON.stringify({ city }),
  });
  return res.json();
});
```

---

## 2. Add a View

The view is what renders in the chat when the AI calls this tool. It receives the tool's output data and a state object.

```tsx
weatherTool.view((data, state) => {
  // Loading state — shown while the tool executes
  if (state?.loading) {
    return <div className="animate-pulse">Fetching weather...</div>;
  }

  // Error state
  if (state?.error) {
    return <div className="text-red-400">{state.error.message}</div>;
  }

  // No data yet
  if (!data) return null;

  // Render the result
  return (
    <div className="p-4 rounded-xl bg-zinc-800 border border-zinc-700">
      <p className="text-xs text-zinc-400 uppercase">{data.city}</p>
      <p className="text-3xl font-light">{data.temp}°</p>
      <p className="text-sm text-zinc-500 capitalize">{data.condition}</p>
    </div>
  );
});
```

### Interactive Views with `onAction`

Views can trigger actions that execute the tool again with new input, and the result syncs back to the AI context:

```tsx
const counterTool = tool({
  name: 'counter',
  description: 'A counter that can be incremented/decremented',
  input: z.object({ name: z.string(), action: z.enum(['create', 'increment', 'decrement']) }),
  output: z.object({ name: z.string(), value: z.number() }),
  autoRespond: true, // Auto-send updated state back to the AI
});

counterTool.view((data, state) => {
  if (!data) return null;
  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl">
      <span className="text-lg">{data.name}: {data.value}</span>
      <button onClick={() => state?.onAction?.({ name: data.name, action: 'increment' })}>
        +
      </button>
      <button onClick={() => state?.onAction?.({ name: data.name, action: 'decrement' })}>
        -
      </button>
    </div>
  );
});
```

---

## 3. Wire Up the API Route

### Next.js (App Router)

```tsx
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import { weatherTool, searchTool } from '@/lib/tools';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: {
      weather: weatherTool.toAITool(),
      search: searchTool.toAITool(),
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### Tool Execution Endpoint

Tools also need a direct execution endpoint for when views trigger `onAction`:

```tsx
// app/api/tools/execute/route.ts
import { tools } from '@/lib/tools';

export async function POST(req: Request) {
  const { tool: toolName, input } = await req.json();

  const tool = tools[toolName];
  if (!tool) return Response.json({ error: 'Tool not found' }, { status: 404 });

  const result = await tool.run(input, { isServer: true });
  return Response.json({ result });
}
```

### Express / Vite

```tsx
import express from 'express';
import { streamText, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { weatherTool } from './tools';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  const result = await streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: { weather: weatherTool.toAITool() },
  });
  result.pipeDataStreamToResponse(res);
});

app.post('/api/tools/execute', async (req, res) => {
  const { tool: name, input } = req.body;
  const tool = tools[name];
  if (!tool) return res.status(404).json({ error: 'Not found' });
  const result = await tool.run(input, { isServer: true });
  res.json({ result });
});

app.listen(3001);
```

---

## 4. Build the Chat UI

### Drop-in (Simplest)

```tsx
import { Chat } from '@lantos1618/better-ui/components';
import { weatherTool, searchTool } from '@/lib/tools';

export default function App() {
  return (
    <Chat
      endpoint="/api/chat"
      tools={{ weather: weatherTool, search: searchTool }}
      className="h-screen"
    />
  );
}
```

That's it. Messages render, tool results render using each tool's `.view()`, streaming works, auto-scroll works.

### Composable (Full Control)

```tsx
import { ChatProvider, Thread, Composer, ChatPanel } from '@lantos1618/better-ui/components';
import { tools } from '@/lib/tools';

export default function App() {
  return (
    <ChatProvider endpoint="/api/chat" tools={tools}>
      <div className="flex h-screen">
        {/* Chat column */}
        <div className="flex-1 flex flex-col">
          <Thread className="flex-1 overflow-y-auto" />
          <Composer placeholder="Ask me anything..." />
        </div>

        {/* Tool results panel (shows latest tool output) */}
        <ChatPanel className="w-[500px] border-l border-zinc-800" />
      </div>
    </ChatProvider>
  );
}
```

### All Chat Components

| Component | What It Does |
|-----------|-------------|
| `Chat` | All-in-one: wraps ChatProvider + Thread + Composer |
| `ChatProvider` | Context provider. Wraps AI SDK's `useChat`. Pass `endpoint`, `tools`, `persistence` |
| `Thread` | Message list with auto-scroll. Renders tool views automatically |
| `Composer` | Text input + send button |
| `Message` | Single message bubble (used inside Thread) |
| `ToolResult` | Renders a tool's `.view()` with loading/error/streaming states |
| `Panel` / `ChatPanel` | Side panel showing the latest tool result |
| `Markdown` | Markdown renderer with syntax highlighting (Shiki) |
| `ThemeProvider` | Injects CSS variables for theming |

### Chat Context

Inside `ChatProvider`, use `useChatContext()` to access everything:

```tsx
import { useChatContext } from '@lantos1618/better-ui/components';

function MyComponent() {
  const {
    messages,      // UIMessage[]
    input,         // current input text
    setInput,      // set input text
    append,        // send a message
    status,        // 'ready' | 'streaming' | 'submitted'
    threads,       // Thread[] (if persistence enabled)
    createThread,  // create new thread
    switchThread,  // switch to thread
    deleteThread,  // delete thread
  } = useChatContext();
}
```

---

## 5. Human-in-the-Loop (HITL)

Tools that perform sensitive actions can require user approval before executing:

```tsx
const sendEmailTool = tool({
  name: 'sendEmail',
  description: 'Send an email',
  input: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  output: z.object({ sent: z.boolean(), messageId: z.string() }),
  confirm: true, // Always require confirmation
});

// Or conditional:
const deleteTool = tool({
  name: 'delete',
  confirm: (input) => input.permanent === true, // Only confirm permanent deletes
  // ...
});

// Or via hints (destructive auto-implies confirmation):
const dropTableTool = tool({
  name: 'dropTable',
  hints: { destructive: true },
  // ...
});
```

When `confirm` is set, calling `.toAITool()` omits the `execute` function. The AI SDK leaves the tool call at `state: 'input-available'`, and the chat UI shows an **Approve / Reject** card. Only after the user approves does the tool execute.

You need a separate confirmation endpoint:

```tsx
// app/api/tools/confirm/route.ts
export async function POST(req: Request) {
  const { tool: name, input } = await req.json();
  const tool = tools[name];
  const result = await tool.run(input, { isServer: true });
  return Response.json({ result });
}
```

---

## 6. Streaming Views

Tools can stream partial results for progressive rendering:

```tsx
const analysisTool = tool({
  name: 'analyze',
  input: z.object({ data: z.string() }),
  output: z.object({ status: z.string(), steps: z.array(z.string()), result: z.string().optional() }),
});

analysisTool.stream(async (input, { stream }) => {
  stream({ status: 'Parsing data...', steps: ['Parsing'] });
  const parsed = parseData(input.data);

  stream({ status: 'Analyzing...', steps: ['Parsing', 'Analyzing'] });
  const analysis = await runAnalysis(parsed);

  stream({ status: 'Complete', steps: ['Parsing', 'Analyzing', 'Done'], result: analysis });
  return { status: 'Complete', steps: ['Parsing', 'Analyzing', 'Done'], result: analysis };
});

analysisTool.view((data, state) => {
  if (state?.streaming) {
    return <ProgressBar steps={data?.steps ?? []} />;
  }
  return <AnalysisResult data={data} />;
});
```

---

## 7. React Hooks (Outside Chat)

Use tools directly in React components, without the chat:

### `useTool`

```tsx
import { useTool } from '@lantos1618/better-ui/react';

function WeatherWidget() {
  const { data, loading, error, execute, reset } = useTool(weatherTool);

  return (
    <div>
      <button onClick={() => execute({ city: 'Tokyo' })}>Get Weather</button>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <p>{data.city}: {data.temp}°, {data.condition}</p>}
    </div>
  );
}
```

### `useToolStream`

```tsx
import { useToolStream } from '@lantos1618/better-ui/react';

function AnalysisWidget() {
  const { data, finalData, streaming, execute } = useToolStream(analysisTool);

  return (
    <div>
      <button onClick={() => execute({ data: '...' })}>Analyze</button>
      {streaming && <p>Status: {data?.status}</p>}
      {finalData && <p>Result: {finalData.result}</p>}
    </div>
  );
}
```

### `useTools` (Multiple)

```tsx
import { useTools } from '@lantos1618/better-ui/react';

function Dashboard() {
  const tools = useTools({ weather: weatherTool, search: searchTool });

  return (
    <div>
      <button onClick={() => tools.weather.execute({ city: 'London' })}>
        Weather
      </button>
      {tools.weather.data && <p>{tools.weather.data.temp}°</p>}

      <button onClick={() => tools.search.execute({ query: 'React' })}>
        Search
      </button>
      {tools.search.loading && <p>Searching...</p>}
    </div>
  );
}
```

---

## 8. Built-in View Components

Pre-built view components for common patterns. Use them in your tool's `.view()`:

```tsx
import {
  QuestionView,
  FormView,
  DataTableView,
  ProgressView,
  MediaDisplayView,
  CodeBlockView,
  FileUploadView,
} from '@lantos1618/better-ui/components';
```

### QuestionView

```tsx
questionTool.view((data, state) => (
  <QuestionView
    question={data.question}
    options={data.options}     // [{ label: string, value: string }]
    allowFreeText={true}
    onSubmit={(answer) => state?.onAction?.({ ...data, answer })}
  />
));
```

### FormView

```tsx
formTool.view((data, state) => (
  <FormView
    title={data.title}
    fields={data.fields}       // [{ name, label, type, required, options? }]
    onSubmit={(values) => state?.onAction?.({ ...data, values })}
  />
));
```

### DataTableView

```tsx
dataTableTool.view((data) => (
  <DataTableView
    columns={data.columns}     // [{ key, label, sortable? }]
    rows={data.rows}           // Record<string, unknown>[]
    pageSize={10}
  />
));
```

### ProgressView

```tsx
progressTool.view((data) => (
  <ProgressView
    steps={data.steps}         // [{ label, status: 'pending'|'running'|'done'|'error', result? }]
    progress={data.progress}   // { done: number, total: number }
  />
));
```

### CodeBlockView

```tsx
codeTool.view((data) => (
  <CodeBlockView
    code={data.code}
    language={data.language}
    filename={data.filename}
  />
));
```

### MediaDisplayView

```tsx
mediaTool.view((data) => (
  <MediaDisplayView
    items={data.items}         // [{ type: 'image'|'video', url, alt?, caption? }]
    layout="grid"              // 'grid' | 'carousel'
  />
));
```

### FileUploadView

```tsx
fileUploadTool.view((data, state) => (
  <FileUploadView
    accept={data.accept}       // ".pdf,.jpg"
    maxFiles={data.maxFiles}
    maxSizeMB={data.maxSizeMB}
    onUpload={(files) => state?.onAction?.({ ...data, files })}
  />
));
```

---

## 9. Persistence

Save chat threads and messages across sessions:

### In-Memory (Development)

```tsx
import { createMemoryAdapter } from '@lantos1618/better-ui/persistence';

const persistence = createMemoryAdapter();

<ChatProvider endpoint="/api/chat" tools={tools} persistence={persistence}>
  ...
</ChatProvider>
```

### Database (Production)

Implement the `PersistenceAdapter` interface:

```tsx
import type { PersistenceAdapter, Thread } from '@lantos1618/better-ui/persistence';

const persistence: PersistenceAdapter = {
  async listThreads() { return await db.threads.findMany(); },
  async getThread(id) { return await db.threads.findUnique({ where: { id } }); },
  async createThread(title?) { return await db.threads.create({ data: { title } }); },
  async deleteThread(id) { await db.threads.delete({ where: { id } }); },
  async getMessages(threadId) { return await db.messages.findMany({ where: { threadId } }); },
  async saveMessages(threadId, messages) {
    await db.messages.deleteMany({ where: { threadId } });
    await db.messages.createMany({ data: messages.map(m => ({ ...m, threadId })) });
  },
};
```

When persistence is enabled, `useChatContext()` gives you `threads`, `createThread()`, `switchThread()`, `deleteThread()`.

---

## 10. MCP Server

Expose your tools to Claude Desktop, Cursor, VS Code, or any MCP client:

```tsx
import { createMCPServer } from '@lantos1618/better-ui/mcp';
import { weatherTool, searchTool } from './tools';

const server = createMCPServer({
  name: 'my-tools',
  version: '1.0.0',
  tools: { weather: weatherTool, search: searchTool },
});

// stdio transport — for Claude Desktop
server.start();

// OR HTTP transport — for web-based MCP clients
// app/api/mcp/route.ts
export const POST = server.httpHandler();

// OR SSE transport — for Streamable HTTP (modern MCP spec)
export const POST = server.streamableHttpHandler();
```

Claude Desktop config (`~/.claude/claude_desktop_config.json`):

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

---

## 11. AG-UI Protocol

Expose your tools via the AG-UI protocol — compatible with CopilotKit, LangChain, Google ADK:

```tsx
import { createAGUIServer } from '@lantos1618/better-ui/agui';
import { weatherTool, searchTool } from './tools';

const server = createAGUIServer({
  name: 'my-tools',
  tools: { weather: weatherTool, search: searchTool },
});

// Next.js route — returns SSE event stream
export const POST = server.handler();
```

Use with CopilotKit:

```tsx
import { CopilotKit } from '@copilotkit/react-core';

<CopilotKit runtimeUrl="/api/agui">
  <YourApp />
</CopilotKit>
```

---

## 12. Authentication

Protect your tool endpoints:

### JWT

```tsx
import { jwtAuth } from '@lantos1618/better-ui/auth';

const auth = jwtAuth({
  secret: process.env.JWT_SECRET!,
  issuer: 'my-app',
});

// In your API route:
export async function POST(req: Request) {
  const user = await auth(new Headers(req.headers));
  // user is now available in ctx
  const result = await tool.run(input, { isServer: true, user });
}
```

### Session Cookies

```tsx
import { sessionAuth } from '@lantos1618/better-ui/auth';

const auth = sessionAuth({
  cookieName: 'session',
  verify: async (token) => {
    const session = await db.sessions.findUnique({ where: { token } });
    if (!session) return null;
    return { userId: session.userId };
  },
});
```

### BetterAuth

```tsx
import { betterAuth } from '@lantos1618/better-ui/auth';
import { auth as authInstance } from '@/lib/auth';

const auth = betterAuth(authInstance);
const { session, user } = await auth(req.headers);
```

---

## 13. Fluent Builder API

Alternative to the object config — chain methods:

```tsx
const search = tool('search')
  .description('Search the database')
  .input(z.object({ query: z.string() }))
  .output(z.object({ results: z.array(z.string()) }))
  .tags('search', 'database')
  .cache({ ttl: 60000 })
  .hints({ readOnly: true })
  .server(async ({ query }) => ({ results: await db.search(query) }))
  .view((data) => (
    <ul>
      {data.results.map((r, i) => <li key={i}>{r}</li>)}
    </ul>
  ))
  .build();
```

---

## 14. Multi-Provider Setup

Better UI works with any AI SDK provider:

```tsx
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// OpenAI
streamText({ model: openai('gpt-4o'), tools: { weather: weatherTool.toAITool() } });

// Anthropic
streamText({ model: anthropic('claude-sonnet-4-5-20250929'), tools: { weather: weatherTool.toAITool() } });

// Google
streamText({ model: google('gemini-2.5-pro'), tools: { weather: weatherTool.toAITool() } });
```

The `.toAITool()` output is provider-agnostic — same tools work everywhere.

---

## Full Example: From Zero to Chat

### 1. Create the project

```bash
npx create-next-app@latest my-ai-app --typescript --tailwind --app
cd my-ai-app
npm install @lantos1618/better-ui zod ai @ai-sdk/openai
```

### 2. Define tools (`lib/tools.tsx`)

```tsx
'use client';
import { tool } from '@lantos1618/better-ui';
import { z } from 'zod';

export const calculator = tool({
  name: 'calculator',
  description: 'Perform arithmetic calculations',
  input: z.object({
    expression: z.string().describe('Math expression like "2 + 2"'),
  }),
  output: z.object({ result: z.number(), expression: z.string() }),
});

calculator.server(async ({ expression }) => {
  // Simple eval (use mathjs in production)
  const result = Function(`"use strict"; return (${expression.replace(/[^0-9+\-*/().]/g, '')})`)();
  return { result: Number(result), expression };
});

calculator.view((data) => {
  if (!data) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 font-mono">
      <p className="text-zinc-400 text-sm">{data.expression} =</p>
      <p className="text-2xl text-white mt-1">{data.result}</p>
    </div>
  );
});

export const tools = { calculator } as Record<string, any>;
```

### 3. API route (`app/api/chat/route.ts`)

```tsx
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import { calculator } from '@/lib/tools';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: {
      calculator: calculator.toAITool(),
    },
  });
  return result.toUIMessageStreamResponse();
}
```

### 4. Tool execution route (`app/api/tools/execute/route.ts`)

```tsx
import { tools } from '@/lib/tools';

export async function POST(req: Request) {
  const { tool: name, input } = await req.json();
  const t = tools[name];
  if (!t) return Response.json({ error: 'Not found' }, { status: 404 });
  const result = await t.run(input, { isServer: true });
  return Response.json({ result });
}
```

### 5. Page (`app/page.tsx`)

```tsx
'use client';
import { Chat } from '@lantos1618/better-ui/components';
import { tools } from '@/lib/tools';

export default function Home() {
  return (
    <div className="h-screen bg-zinc-950 text-white">
      <Chat
        endpoint="/api/chat"
        tools={tools}
        className="h-full"
      />
    </div>
  );
}
```

### 6. Environment (`.env.local`)

```
OPENAI_API_KEY=sk-...
```

### 7. Run

```bash
npm run dev
```

Open http://localhost:3000, type "What's 42 * 17?" and the calculator tool renders its custom view inline.

---

## Summary

| What You Want | How |
|---------------|-----|
| Define a tool | `tool({ name, input, output })` |
| Add server logic | `.server(async (input, ctx) => result)` |
| Add a view | `.view((data, state) => <JSX />)` |
| Use in chat | `<Chat endpoint="..." tools={tools} />` |
| Convert for AI SDK | `.toAITool()` |
| Run directly | `await tool.run(input, { isServer: true })` |
| Use in React | `useTool(tool)` / `useToolStream(tool)` |
| Require approval | `confirm: true` |
| Stream partial results | `.stream(async (input, { stream }) => ...)` |
| Persist conversations | `persistence={adapter}` on ChatProvider |
| Expose via MCP | `createMCPServer({ tools })` |
| Expose via AG-UI | `createAGUIServer({ tools })` |
| Add auth | `jwtAuth()` / `sessionAuth()` / `betterAuth()` |
