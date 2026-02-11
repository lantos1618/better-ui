# TanStack AI - Deep Analysis

> **URL**: https://tanstack.com/ai/latest/docs/overview
> **Category**: Lightweight, Type-Safe AI SDK
> **License**: Open Source
> **Part of**: TanStack Ecosystem (Query, Router, Table, Form)
> **Last Reviewed**: 2026-02-11

---

## Overview

TanStack AI is a **lightweight, type-safe, framework-agnostic SDK** for building AI-powered applications. It provides a modular, tree-shakeable architecture with separate packages for core logic, headless state management, and framework bindings (React, Solid, Preact). It is a standalone alternative to Vercel's AI SDK — not a wrapper around it.

---

## Architecture

### Modular Package Structure

```
┌────────────────────────────────────────────────────┐
│  Framework Bindings                                │
│  @tanstack/ai-react | ai-solid | ai-preact        │
├────────────────────────────────────────────────────┤
│  Headless Client (@tanstack/ai-client)             │
│  ChatClient state machine, streaming,              │
│  tool execution, loading/error states              │
├────────────────────────────────────────────────────┤
│  Core (@tanstack/ai)                               │
│  Adapter interface, chat(), tool system,           │
│  streaming, structured outputs, media generation   │
├────────────────────────────────────────────────────┤
│  Provider Adapters                                 │
│  @tanstack/ai-openai | ai-anthropic | ai-gemini   │
│  ai-ollama | ai-openrouter | ai-grok              │
└────────────────────────────────────────────────────┘
```

### Design Principles

- **Provider-agnostic** — Unified API regardless of LLM provider
- **Tree-shakeable** — Individual imports; ~200KB → ~50KB (75% reduction)
- **Isomorphic tools** — Define once, implement for server or client independently
- **Type-safe end-to-end** — Zod schemas drive TypeScript inference for everything

---

## Core API

### Server-Side: `chat()`

The core server function handling the full agentic loop:

```typescript
import { chat } from '@tanstack/ai'
import { openaiText } from '@tanstack/ai-openai'

const stream = chat({
  adapter: openaiText('gpt-5.2'),
  messages,
  tools: [weatherTool, searchTool],
  systemPrompt: 'You are a helpful assistant.',
})

// Convert to HTTP response
return toServerSentEventsResponse(stream)
// or: return toHttpStream(stream)
```

**Agentic cycle**:
1. LLM analyzes request
2. Decides if tools needed
3. Calls tools (server or client, potentially parallel)
4. Receives results
5. Decides: continue reasoning or generate final answer
6. Loops until done
7. Streams final answer

### Tool Definition System

```typescript
import { toolDefinition } from '@tanstack/ai'

const weatherTool = toolDefinition({
  name: 'getWeather',
  description: 'Get weather for a location',
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({ temp: z.number(), condition: z.string() }),
})
```

### Server Tools

```typescript
const serverWeather = weatherTool.server({
  execute: async ({ city }) => {
    const data = await weatherAPI.get(city)
    return { temp: data.temp, condition: data.condition }
  }
})
```

Server tools:
- Execute automatically on backend when LLM calls them
- Full access to databases, APIs, env vars, secrets
- Input/output validated against schemas
- Results injected back into conversation for continued reasoning

### Client Tools

```typescript
const clientTool = toolDefinition({
  name: 'showNotification',
  description: 'Show a notification to the user',
  inputSchema: z.object({ message: z.string() }),
}).client()
```

Client tools:
- No server-side `execute` function
- Server forwards `tool-input-available` to browser via stream
- Client executes in browser with `onToolCall` callback
- Use cases: UI updates, local storage, geolocation, navigation

### Tool State Machine

```
awaiting-input → input-streaming → input-complete → completed
                                                  ↗
                            approval-requested → approved → executing → output-available
                                              ↘ cancelled
                                                        → error
```

### Tool Approval Flows

```typescript
const dangerousTool = toolDefinition({
  name: 'deleteFile',
  description: 'Delete a file',
  inputSchema: z.object({ path: z.string() }),
  needsApproval: true,  // Requires user consent
}).server({
  execute: async ({ path }) => fs.unlink(path),
})
```

---

## Client-Side API

### Headless ChatClient (`@tanstack/ai-client`)

Framework-independent state machine:

```typescript
const client = new ChatClient({
  connection: fetchServerSentEvents('/api/chat'),
  initialMessages: [],
  onResponse: (response) => { /* ... */ },
  onFinish: () => { /* ... */ },
})

client.sendMessage('Hello')
client.messages  // Current messages
client.isLoading // Loading state
client.stop()    // Cancel streaming
```

### React Hook: `useChat()`

```typescript
import { useChat } from '@tanstack/ai-react'

const {
  messages,
  sendMessage,
  isLoading,
  error,
  addToolApprovalResponse,
  addToolResult,
  reload,
  stop,
  clear,
  setMessages,
} = useChat({
  connection: fetchServerSentEvents('/api/chat'),
  tools: [clientSideTool],
  onResponse: (response) => { /* ... */ },
  onChunk: (chunk) => { /* ... */ },
  onFinish: () => { /* ... */ },
  onError: (error) => { /* ... */ },
})
```

### Connection Adapters

```typescript
// Server-Sent Events (automatic reconnection)
fetchServerSentEvents('/api/chat', {
  headers: { Authorization: `Bearer ${token}` },
})

// HTTP Stream (NDJSON)
fetchHttpStream('/api/chat')

// Custom (WebSocket, etc.)
stream((messages) => customWebSocket(messages))
```

---

## Streaming Protocols

### Server-Sent Events (SSE)
- `data: {JSON}\n\n` format
- Automatic reconnection
- `toServerSentEventsResponse()` / `fetchServerSentEvents()`

### HTTP Stream (NDJSON)
- One JSON object per line
- Simpler than SSE
- `toHttpStream()` / `fetchHttpStream()`

### AG-UI Protocol Events
Richer event types including lifecycle, content streaming, tool operations, and reasoning phases.

---

## Structured Outputs

```typescript
const result = await chat({
  adapter: openaiText('gpt-5.2'),
  messages,
  outputSchema: z.object({
    summary: z.string(),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number(),
  }),
})
// result is typed as { summary: string, sentiment: ..., confidence: number }
```

- Converts Zod/ArkType/Valibot schemas to JSON Schema
- Uses provider's native structured output API
- Validates responses against schema
- Returns `Promise<T>` instead of stream
- Compatible with agentic tool loop (tools run first, then structured output)

---

## Supported AI Activities

| Activity | Description |
|----------|-------------|
| `chat()` | Text generation with streaming |
| `summarize()` | Text summarization |
| `generateImage()` | Image generation (DALL-E, GPT-Image, Gemini Imagen) |
| `generateVideo()` | Video generation |
| `generateSpeech()` | Text-to-speech |
| `generateTranscription()` | Speech-to-text |

---

## Adapter System

Each capability is a separate factory function (tree-shakeable):

```typescript
import { openaiText } from '@tanstack/ai-openai'
import { anthropicText } from '@tanstack/ai-anthropic'
import { geminiText } from '@tanstack/ai-gemini'
import { ollamaText } from '@tanstack/ai-ollama'
```

**Runtime adapter switching** with full type safety:

```typescript
const adapters = {
  openai: () => openaiText('gpt-5.2'),
  anthropic: () => anthropicText('claude-4-sonnet'),
}

const adapter = adapters[userPreference]()
```

### Per-Model Type Safety

TypeScript enforces valid options per model at compile time. Using incompatible options causes a compile error, not a runtime error.

---

## Observability

Decoupled event-driven system (`aiEventClient`):

| Event Category | Examples |
|---------------|----------|
| Text ops | request start/complete, message create, chunk streaming, usage stats |
| Tool interactions | approval requests/responses, call completion, result addition |
| Media processing | image/speech/transcription/video lifecycle |
| Client lifecycle | creation, loading changes, message clearing |

---

## Message Structure

```typescript
interface UIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  createdAt: Date
  parts: (TextPart | ThinkingPart | ToolCallPart | ToolResultPart)[]
}
```

Thinking content (e.g., Claude's extended thinking) automatically converted to `ThinkingPart` and excluded from messages sent back to the model.

---

## Unique Selling Points

1. **Isomorphic Tool Definitions** — Define once with shared schemas, implement separately for server and client. Best-in-class type safety.
2. **True Tree-Shakeability** — 75% bundle size reduction via individual imports per adapter and activity.
3. **Per-Model Type Safety** — TypeScript enforces valid options per model at compile time.
4. **Provider-Agnostic with Runtime Switching** — Switch providers at runtime with full type safety via factory function maps.
5. **Headless Architecture** — `ChatClient` is UI-framework-independent. React/Solid/Preact are thin wrappers.
6. **Built-in Tool Approval Flows** — First-class `needsApproval` with approval state machine.
7. **Rich Tool State Machine** — Observable states at every stage of tool execution.
8. **Dual Streaming Protocols** — SSE + NDJSON + custom adapter escape hatch.
9. **Full Observability** — Event-driven monitoring without external dependencies.
10. **Multi-Activity Support** — Chat, images, video, speech, transcription, summarization.
11. **TanStack Ecosystem** — Familiar patterns for Query/Router/Table/Form users.

---

## Strengths

- Most type-safe AI SDK available (per-model option validation)
- Smallest bundle size via tree-shaking
- Framework-agnostic headless architecture (React, Solid, Preact)
- Isomorphic tool definitions (server + client from one schema)
- Rich tool state machine with approval flows
- Multiple streaming protocol options
- Part of trusted TanStack ecosystem

## Weaknesses

- **No view integration** — tools don't define their own UI rendering
- No built-in rate limiting or caching
- No server framework adapters (route handler factories)
- No built-in chat UI components (headless only)
- No generative UI system
- Newer than Vercel AI SDK, smaller community
- No built-in server/client auto-fetching for tools

---

## Comparison with Vercel AI SDK

| Feature | TanStack AI | Vercel AI SDK |
|---------|-------------|---------------|
| Tree-shaking | Full (75% smaller) | Partial |
| Framework support | React, Solid, Preact | React, Solid, Svelte, Vue |
| Tool type safety | Per-model compile-time | Runtime only |
| Streaming protocols | SSE + NDJSON + custom | Custom protocol |
| Tool approval flows | Built-in | Manual |
| Provider switching | Type-safe runtime switch | Adapter-based |
| Bundle approach | Individual imports | Monolithic packages |
| Structured outputs | Zod + ArkType + Valibot | Zod only |

---

## Summary

TanStack AI is the **most type-safe and lightweight** AI SDK available. Its isomorphic tool definitions, tree-shakeable architecture, and per-model type safety set a new standard for developer experience. The headless `ChatClient` enables framework flexibility. However, it is purely an **SDK layer** — no UI components, no generative UI, no view integration on tools. It excels at the data/streaming/tool-calling layer and leaves UI entirely to the developer.
