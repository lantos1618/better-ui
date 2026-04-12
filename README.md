# Better UI

> Define once. Render in UI. Serve over MCP. Type-safe AI tools with views.

[![npm version](https://img.shields.io/npm/v/@lantos1618/better-ui.svg)](https://www.npmjs.com/package/@lantos1618/better-ui)
[![npm downloads](https://img.shields.io/npm/dm/@lantos1618/better-ui.svg)](https://www.npmjs.com/package/@lantos1618/better-ui)
[![CI](https://github.com/lantos1618/better-ui/actions/workflows/test.yml/badge.svg)](https://github.com/lantos1618/better-ui/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Guide](./GUIDE.md)** · **[API Reference](./docs/)** · **[Examples](./examples/)**

## The idea

One tool definition = schema + server logic + view. Use the same tool in chat, as a React hook, as an MCP server, as an OpenAPI endpoint, or as an AG-UI server.

```bash
npm install @lantos1618/better-ui zod ai @ai-sdk/openai
```

---

## 1. Define tools

```tsx
// lib/tools.tsx
import { tool, Tool } from '@lantos1618/better-ui';
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

weatherTool.server(async ({ city }, ctx) => {
  // ctx.env, ctx.headers, ctx.user, ctx.session available here (stripped on client)
  const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
  const data = await res.json();
  return { temp: Number(data.current_condition[0].temp_C), city, condition: data.current_condition[0].weatherDesc[0].value };
});

weatherTool.view((data, state) => {
  if (state?.loading) {
    return (
      <div className="bg-zinc-800 rounded-xl p-4 text-zinc-400 text-sm animate-pulse">
        Fetching weather...
      </div>
    );
  }
  if (state?.error) {
    return <div className="bg-zinc-800 rounded-xl p-4 text-red-400 text-sm">{state.error.message}</div>;
  }
  if (!data) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <p className="text-xs text-zinc-500 uppercase">{data.city}</p>
      <p className="text-3xl font-light">{data.temp}&deg;</p>
      <p className="text-sm text-zinc-400">{data.condition}</p>
    </div>
  );
});

// Export a registry for routes and components to share
export const tools = { weather: weatherTool } satisfies Record<string, Tool>;
```

Key points:
- `.server(input, ctx)` runs only server-side. `ctx.env`, `ctx.headers`, `ctx.user` are available and auto-stripped on client.
- `.view(data, state)` — `state` has `loading`, `streaming`, `error`, and `onAction` (which takes the tool's **input** schema).
- Calling `.view()` also creates `tool.View` — a memoized React component you can render standalone anywhere.
- No `.client()`? Client auto-fetches to `/api/tools/execute`. Override with `clientFetch: { endpoint: '/my/path' }` in the tool config.

---

## 2. Wire up API routes (Next.js App Router)

### Chat route

```ts
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import { weatherTool } from '@/lib/tools';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: {
      weather: weatherTool.toAITool(),
    },
  });

  return result.toUIMessageStreamResponse();
}
```

`.toAITool()` returns `{ description, inputSchema, execute }` — the format AI SDK v6 expects. The `execute` callback runs `tool.run(input, { isServer: true })` automatically. If the tool has `confirm: true`, `execute` is omitted so the SDK leaves the call at `state: 'input-available'` for HITL approval.

### Passing auth context to AI-called tools

When the LLM calls a tool via `streamText`, the `execute` from `.toAITool()` runs server-side. To pass auth/request context into it, wrap the call:

```ts
// app/api/chat/route.ts
import { betterAuth } from '@lantos1618/better-ui/auth';
import { auth as authInstance } from '@/lib/auth'; // your BetterAuth instance

const auth = betterAuth(authInstance);

export async function POST(req: Request) {
  const { user, session } = await auth(req.headers);
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: {
      // Wrap toAITool's execute to inject auth context
      weather: {
        ...weatherTool.toAITool(),
        execute: async (input) => weatherTool.run(input, {
          isServer: true, user, session, headers: req.headers,
        }),
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
```

Now `ctx.user` and `ctx.session` are available inside `.server(input, ctx)`. Works the same with `jwtAuth()` or `sessionAuth()`.

### Tool execution route

Interactive views call tools directly (via `onAction`). This endpoint handles that:

```ts
// app/api/tools/execute/route.ts
import { tools } from '@/lib/tools';
import { betterAuth } from '@lantos1618/better-ui/auth';
import { auth as authInstance } from '@/lib/auth';

const auth = betterAuth(authInstance);

export async function POST(req: Request) {
  const { user, session } = await auth(req.headers);
  const { tool: name, input } = await req.json();

  const t = tools[name];
  if (!t) return Response.json({ error: 'Tool not found' }, { status: 404 });

  // Pass the same auth context so ctx.user works in onAction calls too
  const result = await t.run(input, { isServer: true, user, session, headers: req.headers });
  return Response.json({ result });
}
```

### HITL confirmation route (only needed if you use `confirm: true`)

```ts
// app/api/tools/confirm/route.ts
import { tools } from '@/lib/tools';

export async function POST(req: Request) {
  const { tool: name, input } = await req.json();
  const t = tools[name];
  if (!t) return Response.json({ error: 'Not found' }, { status: 404 });
  const result = await t.run(input, { isServer: true });
  return Response.json({ result });
}
```

---

## 3. Chat UI

### Drop-in (simplest)

```tsx
// app/page.tsx
'use client';
import { Chat } from '@lantos1618/better-ui/components';
import { tools } from '@/lib/tools';

export default function Page() {
  return (
    <Chat
      endpoint="/api/chat"
      tools={tools}
      className="h-screen"
      placeholder="Ask something..."
      suggestions={["What's the weather in Tokyo?"]}
    />
  );
}
```

`Chat` = `ChatProvider` + `Thread` + `Composer` in one component. Tool views render inline automatically.

### Composable (full control)

```tsx
'use client';
import { ChatProvider, Thread, Composer, ChatPanel } from '@lantos1618/better-ui/components';
import { tools } from '@/lib/tools';

export default function Page() {
  return (
    <ChatProvider endpoint="/api/chat" tools={tools}>
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col">
          <Thread className="flex-1 overflow-y-auto" />
          <Composer placeholder="Ask something..." />
        </div>
        {/* Side panel showing the latest tool result */}
        <ChatPanel className="w-[500px] border-l border-zinc-800" />
      </div>
    </ChatProvider>
  );
}
```

Inside `ChatProvider`, use `useChatContext()` from a child component to access:

```tsx
import { useChatContext } from '@lantos1618/better-ui/components';

const {
  messages,        // UIMessage[]
  sendMessage,     // (text: string) => void
  isLoading,       // boolean
  status,          // 'ready' | 'streaming' | 'submitted'
  tools,           // Record<string, Tool>
  toolStateStore,  // shared tool state
  confirmTool,     // HITL approve
  rejectTool,      // HITL reject
  retryTool,       // retry failed tool
  // When persistence is configured:
  threads,         // Thread[]
  threadId,        // string
  createThread,    // (title?) => Promise<Thread>
  switchThread,    // (id) => Promise<void>
  deleteThread,    // (id) => Promise<void>
} = useChatContext();
```

---

## 4. Interactive views with onAction

Views can trigger tool re-execution. The result updates in-place and optionally syncs back to the AI:

```tsx
const counterTool = tool({
  name: 'counter',
  description: 'Manage a named counter',
  input: z.object({
    name: z.string(),
    action: z.enum(['increment', 'decrement', 'reset', 'get']),
  }),
  output: z.object({ name: z.string(), value: z.number() }),
  autoRespond: true, // auto-send updated state back to AI after user clicks
});

// In-memory for demo only — use a real database in production (resets in serverless)
const counterStore: Record<string, number> = {};

counterTool.server(async ({ name, action }) => {
  if (!(name in counterStore)) counterStore[name] = 0;
  if (action === 'increment') counterStore[name]++;
  if (action === 'decrement') counterStore[name]--;
  return { name, value: counterStore[name] };
});

counterTool.view((data, state) => {
  if (!data) return null;
  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl">
      <span>{data.name}: {data.value}</span>
      <button onClick={() => state?.onAction?.({ name: data.name, action: 'increment' })}>+</button>
      <button onClick={() => state?.onAction?.({ name: data.name, action: 'decrement' })}>-</button>
    </div>
  );
});
```

`onAction` calls `/api/tools/execute` with the new input and updates the view. With `autoRespond: true`, the updated state is also sent to the AI as a hidden message so it stays in sync.

---

## 5. HITL (human-in-the-loop)

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
  confirm: true, // always show Approve/Reject before executing
});

// Or conditional:
const deleteTool = tool({
  name: 'delete',
  input: z.object({ id: z.string(), permanent: z.boolean() }),
  confirm: (input) => input.permanent === true, // only confirm permanent deletes
  // ...
});

// Or via hints (destructive auto-implies confirmation):
const dropTool = tool({
  name: 'dropTable',
  hints: { destructive: true },
  // ...
});
```

The chat UI automatically shows an Approve/Reject card. Approved tools hit `/api/tools/confirm`.

---

## 6. Streaming

Use `.stream()` instead of (or alongside) `.server()` when you need partial updates before the final result:

```tsx
const analysisTool = tool({
  name: 'analyze',
  input: z.object({ data: z.string() }),
  output: z.object({ status: z.string(), result: z.string() }),
});

analysisTool.stream(async (input, { stream }) => {
  stream({ status: 'Parsing...' });
  const parsed = JSON.parse(input.data); // your parsing logic
  stream({ status: 'Analyzing...' });
  const result = `Processed ${Object.keys(parsed).length} fields`; // your analysis
  return { status: 'Done', result };
});

analysisTool.view((data, state) => {
  if (state?.streaming) return <p>{data?.status}</p>;
  return <p>{data?.result}</p>;
});
```

`state.streaming` is true while partials arrive.

---

## 7. React hooks (outside chat)

Use tools directly in any React component:

```tsx
import { useTool } from '@lantos1618/better-ui/react';

function WeatherWidget() {
  const { data, loading, error, execute } = useTool(weatherTool);

  return (
    <div>
      <button onClick={() => execute({ city: 'Tokyo' })}>Get Weather</button>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <weatherTool.View data={data} />}
    </div>
  );
}
```

Calling `.view()` on a tool also creates `tool.View` — a memoized React component you can render standalone, outside of chat.

### useToolStream

```tsx
import { useToolStream } from '@lantos1618/better-ui/react';

const { data, finalData, streaming, execute } = useToolStream(analysisTool);
```

### useTools (multiple)

```tsx
import { useTools } from '@lantos1618/better-ui/react';

function Dashboard() {
  const t = useTools({ weather: weatherTool, search: searchTool });

  return (
    <div>
      <button onClick={() => t.weather.execute({ city: 'London' })}>
        {t.weather.loading ? 'Loading...' : t.weather.data?.temp ?? 'Get Weather'}
      </button>
      <button onClick={() => t.search.execute({ query: 'React' })}>
        {t.search.loading ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
}
```

---

## 8. MCP server

Expose the same tools to Claude Desktop, Cursor, VS Code:

```ts
// mcp-server.ts
import { createMCPServer } from '@lantos1618/better-ui/mcp';
import { weatherTool, searchTool } from './lib/tools';

const server = createMCPServer({
  name: 'my-tools',
  version: '1.0.0',
  tools: { weather: weatherTool, search: searchTool },
});

server.start(); // stdio transport
```

```jsonc
// ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "my-tools": { "command": "npx", "args": ["tsx", "mcp-server.ts"] }
  }
}
```

Or as an HTTP endpoint:

```ts
// app/api/mcp/route.ts
export const POST = server.httpHandler();
// or for SSE streaming:
export const POST = server.streamableHttpHandler();
```

---

## 9. AG-UI server

Expose tools via AG-UI protocol (CopilotKit, LangChain, Google ADK):

```ts
// app/api/agui/route.ts
import { createAGUIServer } from '@lantos1618/better-ui/agui';
import { tools } from '@/lib/tools';

export const POST = createAGUIServer({
  name: 'my-tools',
  tools,
}).handler();
```

---

## 10. Built-in view components

Pre-built views for common patterns. Use in your tool's `.view()`:

```tsx
import {
  QuestionView,     // multiple choice / free-text
  FormView,         // dynamic forms from field definitions
  DataTableView,    // sortable paginated table
  ProgressView,     // step-by-step progress tracker
  CodeBlockView,    // syntax highlighted code with copy button
  MediaDisplayView, // image/video grid or carousel
  FileUploadView,   // drag-and-drop file upload
} from '@lantos1618/better-ui/components';

// Example: question tool
questionTool.view((data, state) => (
  <QuestionView
    question={data.question}
    options={data.options}      // { label: string, value: string }[]
    allowFreeText={true}
    onSubmit={(answer) => state?.onAction?.({ ...data, answer })}
  />
));

// Example: form tool
formTool.view((data, state) => (
  <FormView
    title={data.title}
    fields={data.fields}        // { name, label, type, required, options? }[]
    onSubmit={(values) => state?.onAction?.({ ...data, values })}
  />
));

// Example: data table
tableTool.view((data) => (
  <DataTableView
    columns={data.columns}     // { key, label, sortable? }[]
    rows={data.rows}           // Record<string, unknown>[]
    pageSize={10}
  />
));
```

---

## 11. Tool side effects

React to tool results outside the chat (e.g. open URLs, change themes):

```tsx
import { useChatContext, useToolEffect } from '@lantos1618/better-ui/components';

function SideEffects() {
  const { toolStateStore } = useChatContext();

  useToolEffect(toolStateStore, 'navigate', (entry) => {
    const data = entry.output as { url: string };
    if (data?.url) window.open(data.url, '_blank');
  });

  return null;
}
```

---

## 12. Persistence

### In-memory (dev)

```tsx
import { createMemoryAdapter } from '@lantos1618/better-ui/persistence';

<ChatProvider
  endpoint="/api/chat"
  tools={tools}
  persistence={createMemoryAdapter()}
>
```

### Database (production)

Implement `PersistenceAdapter`:

```ts
import type { PersistenceAdapter, Thread } from '@lantos1618/better-ui/persistence';
import type { UIMessage } from 'ai';

const persistence: PersistenceAdapter = {
  listThreads():                          Promise<Thread[]>     { /* ... */ },
  getThread(id: string):                  Promise<Thread | null> { /* ... */ },
  createThread(title?: string):           Promise<Thread>       { /* ... */ },
  deleteThread(id: string):               Promise<void>         { /* ... */ },
  getMessages(threadId: string):          Promise<UIMessage[]>  { /* ... */ },
  saveMessages(threadId: string, msgs: UIMessage[]): Promise<void> { /* ... */ },
};
```

Messages auto-save when AI finishes responding. `useChatContext()` exposes `threads`, `createThread`, `switchThread`, `deleteThread`.

---

## 13. Auth

```ts
import { jwtAuth, sessionAuth, betterAuth } from '@lantos1618/better-ui/auth';

// JWT Bearer tokens (uses jose)
const auth = jwtAuth({ secret: process.env.JWT_SECRET! });

// Cookie sessions
const auth = sessionAuth({
  cookieName: 'session',
  verify: async (token) => db.sessions.findUnique({ where: { token } }),
});

// BetterAuth
const auth = betterAuth(authInstance);

// Usage in a route:
const user = await auth(req.headers);
const result = await tool.run(input, { isServer: true, user });
```

---

## 14. Providers

```ts
import { createProvider } from '@lantos1618/better-ui';

const p = createProvider({ provider: 'openai', model: 'gpt-4o' });
// or: 'anthropic' + 'claude-sonnet-4-5-20250929'
// or: 'google' + 'gemini-2.5-pro'
// or: 'openrouter' + 'anthropic/claude-sonnet-4-5-20250929' (needs apiKey)

// Use in streamText:
streamText({ model: p.model(), tools: { ... } });
```

---

## 15. Fluent builder (alternative syntax)

```tsx
const search = tool('search')
  .description('Search the database')
  .input(z.object({ query: z.string() }))
  .output(z.object({ results: z.array(z.string()) }))
  .cache({ ttl: 60_000 })
  .hints({ readOnly: true })
  .server(async ({ query }) => ({ results: await db.search(query) }))
  .view((data) => <ul>{data.results.map((r, i) => <li key={i}>{r}</li>)}</ul>)
  .build();
```

---

## 16. OpenAPI / Swagger

Auto-generate an OpenAPI 3.1 spec and callable REST endpoints from your tools:

```ts
import { toolRouter } from '@lantos1618/better-ui/openapi';
import { tools } from './tools';

// Next.js catch-all: app/api/tools/[...path]/route.ts
const router = toolRouter({ tools });
export const GET = router;
export const POST = router;
```

That gives you:

| Endpoint | What |
|---|---|
| `POST /api/tools/weather` | Execute tool, returns `{ result }` |
| `GET /api/tools` | OpenAPI 3.1 JSON spec |
| `GET /api/tools/docs` | Swagger UI |

With auth/rate-limiting:

```ts
const router = toolRouter({
  tools,
  onBeforeExecute: async (toolName, input, req) => {
    const user = await auth(req.headers);
    if (!user) throw new Error('Unauthorized');
  },
});
```

Or just generate the spec without the router:

```ts
import { generateOpenAPISpec, openAPIHandler } from '@lantos1618/better-ui/openapi';

// Get the spec object
const spec = generateOpenAPISpec({ title: 'My API', version: '1.0.0', tools });

// Or serve it as a route
export const GET = openAPIHandler({ title: 'My API', version: '1.0.0', tools });
```

---

## Cheat sheet

| I want to...                 | Code                                            |
|------------------------------|-------------------------------------------------|
| Define a tool                | `tool({ name, input, output })`                 |
| Add server logic             | `.server(async (input, ctx) => result)`          |
| Add a view                   | `.view((data, state) => <JSX />)`               |
| Drop into chat               | `<Chat endpoint="..." tools={tools} />`         |
| Composable chat              | `<ChatProvider>` + `<Thread>` + `<Composer>`    |
| Convert for AI SDK           | `tool.toAITool()`                               |
| Run directly                 | `await tool.run(input, { isServer: true })`     |
| Use as React hook            | `useTool(tool)` / `useToolStream(tool)`         |
| Render view standalone       | `<tool.View data={data} />`                     |
| Require approval             | `confirm: true`                                 |
| Stream partial results       | `.stream(async (input, { stream }) => ...)`     |
| Sync UI actions back to AI   | `autoRespond: true`                             |
| React to tool results        | `useToolEffect(store, 'toolName', callback)`    |
| Persist conversations        | `persistence={adapter}` on `ChatProvider`       |
| Expose via MCP               | `createMCPServer({ tools }).start()`            |
| Expose via AG-UI             | `createAGUIServer({ tools }).handler()`         |
| Add auth                     | `jwtAuth()` / `sessionAuth()` / `betterAuth()` |
| OpenAPI spec                 | `generateOpenAPISpec({ tools })`                |
| Callable REST + Swagger UI   | `toolRouter({ tools })`                         |

---

## Project structure

```
src/
  tool.tsx              Core tool() API — schema, handlers, view, streaming
  index.ts              Main exports (server-safe, no React)
  react/                useTool, useTools, useToolStream hooks
  components/           Chat, Thread, Composer, ToolResult, Panel, Markdown, Form, etc.
  providers/            OpenAI, Anthropic, Google, OpenRouter adapters
  auth/                 JWT, session cookie, BetterAuth helpers
  persistence/          PersistenceAdapter interface + in-memory adapter
  mcp/                  MCP server (stdio + HTTP + SSE)
  agui/                 AG-UI protocol server (SSE)
  openapi/              OpenAPI spec generator + tool router
examples/
  nextjs-demo/          Full Next.js chat app
  vite-demo/            Vite + React demo
  mcp-server/           Standalone MCP server
```

## Development

```bash
npm install
npm run build        # Build library
npm test             # Run 250 tests across 12 suites
npm run type-check   # TypeScript check
```

## License

MIT
