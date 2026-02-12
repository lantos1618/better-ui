# Gap Analysis: Better UI vs Competitors

> **Last Reviewed**: 2026-02-12
> **Competitors Analyzed**: CopilotKit, assistant-ui, Tambo, TanStack AI, xmcp

---

## Executive Summary

Better UI has evolved from a tool-definition library into a **full-stack AI UI framework** with:
- **Complete chat infrastructure**: ChatProvider, Thread, Panel, Composer, Message, ToolResult
- **Human-in-the-Loop**: Conditional per-input confirmation with `confirm: boolean | ((input) => boolean)`
- **Bidirectional state sync**: JSON envelope pipeline with dirty tracking and autoRespond
- **Tool grouping**: Collapse repeated tool calls via `groupKey` + `seqNo`
- **8 rich view components**: Question, Form, DataTable, Progress, MediaDisplay, CodeBlock, Toast, FileUpload
- **Multi-provider support**: OpenAI, Anthropic, Google, OpenRouter adapters
- **Streaming tool views**: `.stream()` handler with progressive partial updates
- **Behavioral hints**: `destructive`, `readOnly`, `idempotent` on tool definitions
- **Full documentation**: 34-page Mintlify docs site with guides, API reference, and component docs

Its core differentiator — **tools that define their own UI with interactive state sync** — remains unique and is now backed by production-grade infrastructure.

---

## Feature Comparison Matrix

| Feature | Better UI | CopilotKit | assistant-ui | Tambo | TanStack AI | xmcp |
|---------|-----------|------------|--------------|-------|-------------|------|
| **Tool Definition** | | | | | | |
| Tool creation API | `tool()` fluent + config | `useCopilotAction` | Backend-defined | `TamboComponent` | `toolDefinition()` | File-system routing |
| Input schema (Zod) | Yes | Yes | Via backend | Yes | Yes | Yes |
| Output schema (Zod) | **Yes** | No | No | Yes | Yes | Via structured content |
| Tool-level view integration | **Yes (.view())** | No | No | No | No | **Yes (React widgets)** |
| Tool behavioral hints | **Yes (destructive, readOnly, idempotent)** | No | No | No | No | **Yes** |
| **Execution** | | | | | | |
| Server execution | Yes | Yes | Via runtime | Yes | Yes | **Yes (MCP native)** |
| Client execution | Yes | Yes (frontend tools) | Yes (3 modes) | Yes (local tools) | Yes (client tools) | No (server only) |
| Auto-fetch fallback | **Yes (unique)** | No | No | No | No | No |
| Tool approval / HITL | **Yes (conditional)** | Yes | Yes | No | Yes | No |
| Tool state machine | Partial (confirm/reject/execute) | No | No | No | **Yes (rich)** | No |
| Streaming execution | **Yes (.stream() + runStream)** | No | Partial | **Yes (prop streaming)** | No | No |
| **UI Components** | | | | | | |
| Chat UI components | **Yes (ChatProvider, Thread, Panel, Composer, Message, ToolResult)** | Yes (4 variants) | **Yes (full primitives)** | Yes (tambo-ui) | No | No (server only) |
| Pre-built view components | **Yes (8 components)** | Yes | Yes (shadcn) | Yes | No | No |
| Composable primitives | Partial | Partial | **Yes (Radix-style)** | Partial | No | No |
| Headless mode | Yes (tools without Chat) | Yes | Yes | No | **Yes (ChatClient)** | N/A |
| **Widget/View System** | | | | | | |
| Tool-owned views | **Yes (.view())** | No | No | No | No | **Yes (React .tsx handlers)** |
| Interactive widgets | **Yes (onAction + state sync)** | No | No | **Yes** | No | **Yes (useState in widgets)** |
| Auto-respond after action | **Yes (unique)** | No | No | No | No | No |
| Tool grouping/collapsing | **Yes (groupKey + seqNo, unique)** | No | No | No | No | No |
| **State Management** | | | | | | |
| React hooks | `useTool`, `useToolOutput`, `useChatToolOutput`, `useChatContext` | Multiple hooks | **Comprehensive** | Multiple hooks | `useChat` | No (server only) |
| Bidirectional state sync | **Yes (JSON envelopes, dirty tracking)** | **Yes (useCoAgent)** | Yes (ExternalStore) | Yes (componentState) | No | No |
| Tool state store | **Yes (createToolStateStore, entityId grouping)** | No | No | No | No | No |
| Thread management | Basic (Thread component) | Yes | **Yes (full)** | Yes | Basic | No |
| Message branching | No | No | **Yes** | No | No | No |
| **Server Infrastructure** | | | | | | |
| Framework adapters | **Yes (Next.js + Express)** | Partial | No | No | No | **Yes (Next.js + Express + NestJS)** |
| Rate limiting | **Yes (in-memory + Redis)** | No | No | No | No | Via middleware |
| Caching | **Yes (TTL-based)** | No | No | No | No | No |
| Audit logging | **Yes** | No | No | No | No | Telemetry |
| Authentication | No | No | No | API key | No | **Yes (API key + JWT + OAuth 2.1 + Auth0 + Better Auth)** |
| **AI/LLM Integration** | | | | | | |
| AI SDK compatibility | Vercel AI SDK v5 | Multi-adapter | Multi-runtime | Multi-provider | **Own SDK** | N/A (MCP protocol) |
| Multi-LLM support | **Yes (OpenAI, Anthropic, Google, OpenRouter)** | **Yes (6+ adapters)** | **Yes (12+ providers)** | Yes (6+ providers) | **Yes (6+ adapters)** | N/A (client-agnostic) |
| Agent framework support | No | **Yes (6+ frameworks)** | Yes (LangGraph+) | Built-in agent | No | No |
| **Protocols** | | | | | | |
| AG-UI Protocol | No | **Yes** | No | No | Partial | No |
| MCP Protocol | No | **Yes** | No | **Yes** | No | **Yes (IS MCP)** |
| A2A Protocol | No | **Yes** | No | No | No | No |
| **Developer Experience** | | | | | | |
| TypeScript type safety | **Strong** | Good | Good | Good | **Strongest** | **Strong** |
| Bundle size | Small | Large | Medium | Medium | **Smallest** | N/A (server) |
| Documentation | **Comprehensive (Mintlify, 34 pages)** | **Comprehensive** | **Comprehensive** | Good | **Comprehensive** | Good |
| DevTools | No | Yes (inspector) | **Yes** | No | Yes (events) | Telemetry |

---

## Better UI's Competitive Advantages

### 1. Tool-Level View Integration (Core Differentiator)

Better UI and xmcp both allow tools to define their own rendering, but with fundamentally different architectures:

```typescript
// Better UI — client-side, tool owns its view as a React component
weather.view((data, { loading, error, onAction }) => {
  if (loading) return <Spinner />;
  return <WeatherCard temp={data.temp} />;
})

// xmcp — server-side, tool handler returns React that renders as an MCP widget
export default {
  handler: ({ city, temp }) => (
    <div className="weather-card">{temp}° in {city}</div>
  ),
}
```

**Key difference**: Better UI's views are **client-side React components** you embed in your own app. xmcp's widgets are **server-rendered HTML** delivered to MCP clients.

### 2. Interactive State Sync (Unique)

No other framework has the full pipeline:
- **onAction** re-executes tools from the view
- **Dirty tracking** knows which tool states changed via user interaction
- **JSON envelopes** bundle state context with messages
- **Server-side extraction** injects state into AI context
- **autoRespond** continues the conversation automatically after interaction
- **Hidden messages** for state-only syncs that don't clutter the chat

### 3. Tool Grouping (Unique)

`groupKey` + `seqNo` collapse repeated tool calls. When the AI updates a task list 10 times, the user sees 1 full card + 9 collapsed chips. No other framework does this.

### 4. Conditional HITL (Rare)

`confirm: (input) => input.action === 'create'` — per-input confirmation decisions. Most frameworks only support `confirm: true/false`. Only TanStack AI has comparable conditional logic.

### 5. 8 Rich View Components (Unique Breadth)

Pre-built, production-ready view components designed for AI tool output:
- **Question**: Single/multi-select with freeform input
- **Form**: Schema-driven with text/number/email/textarea/select/toggle
- **DataTable**: Sortable, paginated tables
- **Progress**: Step-based or percentage bar
- **MediaDisplay**: Image grid with lightbox, video, audio
- **CodeBlock**: Copy button, line numbers, diff view
- **Toast**: Non-blocking notifications
- **FileUpload**: Drag-and-drop with validation

### 6. Server Infrastructure (Strong)

- Next.js + Express adapters
- In-memory + Redis rate limiting
- TTL-based declarative caching
- Audit logging
- Server context stripping on client (security)
- Auto-fetch fallback (unique)

---

## Remaining Gaps

### Critical Gaps (High Priority)

#### Gap 1: No MCP Protocol Support
**What competitors have**: CopilotKit implements MCP. Tambo has MCP. xmcp IS an MCP framework.
**What Better UI has**: No MCP support.
**Impact**: Better UI tools can't be consumed by MCP clients (ChatGPT, Claude) or call MCP servers.
**Recommendation**: Two paths:
1. `tool().asMCP()` — expose Better UI tools as MCP servers
2. `tool().fromMCP()` — consume external MCP servers as Better UI tools

#### Gap 2: No Authentication System
**What xmcp has**: API key, JWT, OAuth 2.1 with PKCE, Auth0, Better Auth.
**What Better UI has**: Nothing built-in.
**Recommendation**: Add middleware-based auth for server adapters. At minimum: API key + JWT verification.

#### Gap 3: No Agent Framework Integration
**What competitors have**: CopilotKit supports LangGraph, Google ADK, A2A agents. assistant-ui has LangGraph.
**What Better UI has**: No agent framework integration.
**Recommendation**: LangGraph integration would be highest value.

### Moderate Gaps (Medium Priority)

#### Gap 4: No Composable Chat Primitives (Radix-style)
**What assistant-ui has**: Deep primitive composition — `ThreadRoot`, `ThreadMessages`, `MessageContent`, etc. Full Radix/shadcn-style tree.
**What Better UI has**: Opinionated components (Thread, Message, Composer). Less composable but easier to use.
**Recommendation**: Consider a `@better-ui/primitives` package for advanced customization. The current approach works for most use cases.

#### Gap 5: No Thread Persistence / Branching
**What assistant-ui has**: Full thread model with branching, persistence, lists.
**What Better UI has**: In-memory conversation via AI SDK's `useChat`. A Drizzle persistence example exists.
**Recommendation**: Add first-class persistence adapters (Drizzle, Prisma, custom).

#### Gap 6: No DevTools
**What competitors have**: assistant-ui has `@assistant-ui/react-devtools`. CopilotKit has an inspector.
**Recommendation**: Add a DevTools panel showing tool executions, state store, dirty tracking, and cache stats.

#### Gap 7: Limited Generative UI
**What Tambo has**: AI selects which component to render from a registry + streams props.
**What Better UI has**: Tool views render by tool name. AI chooses which TOOL to call, and the view renders automatically. Less flexible than component selection but more structured.
**Recommendation**: The tool-based approach may actually be better for most cases. Consider this a design choice, not a gap.

### Lower Priority Gaps

| Gap | Status | Notes |
|-----|--------|-------|
| Voice input | Not started | Defer unless demand |
| A2A Protocol | Not started | CopilotKit-only for now |
| AG-UI Protocol | Not started | Consider when protocol matures |
| CLI scaffolding | Not started | `create-better-ui` for bootstrapping |
| Multi-framework (Vue, Svelte) | Not started | React-first is fine |
| Monetization / Marketplace | Not started | Foundation exists (portable tools + views) |

---

## Gaps Closed Since Last Review

| Gap | Status | What We Built |
|-----|--------|---------------|
| ~~No Chat UI Components~~ | **CLOSED** | ChatProvider, Thread, Panel, Composer, Message, ToolResult, Chat, Markdown |
| ~~No Tool Approval / HITL~~ | **CLOSED** | `confirm: boolean \| ((input) => boolean)`, `shouldConfirm()`, confirm endpoint, auto-approve for conditional |
| ~~No Streaming Tool Views~~ | **CLOSED** | `.stream()` handler, `runStream()`, `state.streaming` in views |
| ~~No Multi-LLM Support~~ | **CLOSED** | OpenAI, Anthropic, Google, OpenRouter provider adapters |
| ~~No Tool Behavioral Metadata~~ | **CLOSED** | `hints: { destructive, readOnly, idempotent }`, destructive auto-implies confirm |
| ~~Limited Documentation~~ | **CLOSED** | 34-page Mintlify docs site with guides, API reference, component docs |
| ~~No Bidirectional State Sync~~ | **CLOSED** | JSON envelopes, dirty tracking, autoRespond, server-side extraction |
| ~~Partial Interactive Widgets~~ | **CLOSED** | Full onAction + state sync + autoRespond pipeline |
| ~~No Pre-built View Components~~ | **NEW** | 8 components: Question, Form, DataTable, Progress, MediaDisplay, CodeBlock, Toast, FileUpload |
| ~~No Tool Grouping~~ | **NEW** | `groupKey` + `seqNo` + collapsed chips + multi-item Panel |
| ~~No Audit Logging~~ | **NEW** | Structured audit logger with tool execution tracking |

---

## Strategic Positioning

### Where Better UI Wins

```
Tool Definition ──→ Execution ──→ View Rendering ──→ State Sync ──→ Chat UI
     ↑                 ↑               ↑                 ↑              ↑
  Zod in+out     Auto-fetch       Tool-owned views   JSON envelopes   Thread
  Fluent API     Streaming        8 view components  Dirty tracking   Panel
  Conditional    Rate limiting    Tool grouping      autoRespond      Composer
  HITL           Caching          Collapsed chips    Hidden messages  Message
```

Better UI is now a **complete framework for building AI applications where tools are first-class UI citizens**. The combination of tool-owned views + interactive state sync + tool grouping + conditional HITL is not available in any other framework.

### Where Better UI Loses

```
Chat Primitives  → assistant-ui (Radix-style composability)
Agent Platform   → CopilotKit (full agentic platform with 3 protocols)
MCP Ecosystem    → xmcp (IS an MCP framework with auth + deployment)
Authentication   → xmcp (5 auth methods built-in)
Type Safety/SDK  → TanStack AI (per-model types, tree-shaking)
```

### Recommended Next Steps

1. **MCP compatibility** — expose tools as MCP servers, consume external MCP tools
2. **Authentication** — API key + JWT middleware for server adapters
3. **Thread persistence** — first-class Drizzle/Prisma adapters
4. **DevTools** — tool execution inspector, state store viewer
5. **Agent integration** — LangGraph adapter

---

## Quick Reference: What Each Framework Does Best

| Framework | Core Strength | Best For |
|-----------|--------------|----------|
| **CopilotKit** | Full-stack agentic platform with 3 protocols | Complex multi-agent applications |
| **assistant-ui** | Composable chat UI primitives | Custom, production-grade chat interfaces |
| **Tambo** | AI component selection + prop streaming | AI-driven UI where AI picks the components |
| **TanStack AI** | Type-safe, lightweight AI SDK | Minimal, type-safe AI integration |
| **xmcp** | MCP server framework with React widgets | Building tool backends for AI clients |
| **Better UI** | Tool-first with views, state sync, and HITL | AI apps where tools are interactive UI with full state management |
