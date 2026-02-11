# xmcp - Deep Analysis

> **URL**: https://xmcp.dev
> **GitHub**: https://github.com/basementstudio/xmcp
> **Category**: MCP Server Framework with Widget UI
> **License**: MIT
> **Stars**: 1,200+
> **Built by**: Basement Studio
> **Last Reviewed**: 2026-02-11

---

## Overview

xmcp is a **TypeScript framework for building MCP (Model Context Protocol) servers**. It's fundamentally different from the other frameworks analyzed — while CopilotKit, assistant-ui, Tambo, and TanStack AI are client-side or full-stack frameworks for building AI chat interfaces, xmcp is a **server-side framework** for building the tool backends that AI clients connect to.

Its core innovation is making MCP server development trivially easy through file-system routing, automatic tool registration, and a widget system that lets tools return interactive React components.

**Tagline**: "The easiest and fastest way to build an MCP server."

---

## Architecture

### File-System Based Design

```
src/
  tools/           # Auto-registered as MCP tools
    weather.ts     # → tool: "weather"
    housing/
      search.ts    # → tool: "housing_search"
  prompts/         # Auto-registered as MCP prompts
    relocate.ts    # → prompt: "relocate"
  resources/       # Auto-registered as MCP resources
    (users)/
      [userId]/
        profile.ts # → resource: users://{userId}/profile
  clients.ts       # External MCP server connections
```

Convention-over-configuration: drop a file in the right folder, it becomes an MCP tool/prompt/resource automatically.

### Three-Layer Architecture

```
┌──────────────────────────────────────────────┐
│  Widget Layer (Optional)                     │
│  React components, Tailwind, CSS Modules     │
│  Rendered as interactive widgets in clients   │
├──────────────────────────────────────────────┤
│  Tool/Prompt/Resource Layer                  │
│  Zod schemas, handlers, metadata,            │
│  file-system routing, auto-registration      │
├──────────────────────────────────────────────┤
│  Transport & Infrastructure Layer            │
│  HTTP/STDIO transport, auth, middleware,      │
│  bundling (rspack), deployment               │
└──────────────────────────────────────────────┘
```

### Transport Layer

| Transport | Use Case | Production Ready |
|-----------|----------|-----------------|
| HTTP | Production deployment | Yes |
| STDIO | Local development / desktop apps | No (dev only) |

---

## Tool System

### Tool Definition

```typescript
// src/tools/search-housing.ts
import { z } from "zod"
import { InferSchema } from "xmcp"

const schema = {
  city: z.string().describe("City to search"),
  bedrooms: z.number().describe("Number of bedrooms"),
  maxPrice: z.number().describe("Maximum monthly rent"),
}

type Input = InferSchema<typeof schema>

export default {
  schema,
  description: "Search for housing listings in a city",
  _meta: {
    hint: {
      readOnlyHint: true,
    },
  },
  handler: async ({ city, bedrooms, maxPrice }: Input) => {
    const listings = await housingAPI.search(city, bedrooms, maxPrice)
    return { structuredContent: { listings } }
  },
}
```

### Tool Behavioral Hints

Tools can declare behavioral metadata:
- `destructiveHint` — tool modifies external state
- `readOnlyHint` — tool only reads data
- `idempotentHint` — safe to retry
- `openWorldHint` — interacts with external entities

### Tool Return Values

| Type | Format | Use Case |
|------|--------|----------|
| Simple | `string \| number` | Plain text responses |
| Content array | `{ content: [{ type, text }] }` | Multi-part responses |
| Structured | `{ structuredContent: { ... } }` | Typed data objects |
| Combined | Both content + structured | Backward compatibility |
| Widget | React component (`.tsx` handler) | Interactive UI |

---

## Widget System (Tool UI)

The standout feature — tools can return **interactive React components** that render in MCP clients.

### Three Widget Tiers

#### 1. Standard Handlers (Data Only)
```typescript
// src/tools/weather.ts
export default {
  schema: { city: z.string() },
  handler: async ({ city }) => {
    return `Temperature in ${city}: 72°F`
  },
}
```

#### 2. Template Literal Handlers (HTML Widgets)
```typescript
// src/tools/chart.ts
export default {
  schema: { data: z.array(z.number()) },
  _meta: { openai: { widgetAccessible: true } },
  handler: async ({ data }) => {
    return `<div id="chart"><script>renderChart(${JSON.stringify(data)})</script></div>`
  },
}
```

#### 3. React Component Handlers (Interactive Widgets)
```tsx
// src/tools/housing-search.tsx  ← note .tsx extension
import { useState } from "react"

export default {
  schema: { city: z.string(), listings: z.array(listingSchema) },
  handler: ({ city, listings }) => {
    const [saved, setSaved] = useState<string[]>([])
    return (
      <div className="housing-results">
        <h2>Housing in {city}</h2>
        {listings.map(listing => (
          <div key={listing.id} className="listing-card">
            <h3>{listing.title}</h3>
            <p>${listing.price}/mo</p>
            <button onClick={() => setSaved([...saved, listing.id])}>
              {saved.includes(listing.id) ? "Saved ✓" : "Save"}
            </button>
          </div>
        ))}
      </div>
    )
  },
}
```

**Key insight**: Just rename `.ts` → `.tsx` and return JSX. xmcp handles bundling, CSS, and delivery to the MCP client automatically.

### Widget Client Support

Widgets automatically work in:
- **ChatGPT** — via `_meta.openai` configuration
- **MCP Apps** — via `_meta.ui` configuration (or automatic)
- **Any MCP-compatible client** — standard protocol

### Widget Styling

- Tailwind CSS (auto-detected `globals.css`)
- CSS Modules (`.module.css` files)
- Plain CSS
- CSP configuration for external resources

---

## Authentication & Authorization

Most comprehensive auth system of any framework analyzed:

| Method | Mechanism | Use Case |
|--------|-----------|----------|
| API Keys | Static credentials via custom header | Simple server-to-server |
| JWT | Self-contained tokens with claims | Stateless auth |
| OAuth 2.1 + PKCE | Full authorization flow | Production user auth |
| Auth0 Plugin | Dynamic client registration, RBAC | Enterprise |
| Better Auth Plugin | PostgreSQL-backed, email/password + OAuth | Self-hosted |

### Auth in Tool Handlers

```typescript
handler: async ({ city }, extra) => {
  const user = extra.authInfo  // clientId, scopes, expiration
  // Use auth context in tool logic
}
```

---

## Middleware System

```typescript
// xmcp.config.ts
export default {
  middlewares: [
    authMiddleware,
    rateLimitMiddleware,
    loggingMiddleware,
  ],
}
```

Middleware can access request headers, modify responses, and short-circuit the pipeline.

---

## External MCP Client Generation

Connect to OTHER MCP servers with full type safety:

```typescript
// src/clients.ts
export const clients = {
  immigration: "https://immigration-api.example.com/mcp",
  housing: "https://housing-api.example.com/mcp",
}

// Generated: fully-typed TypeScript clients
// import { immigrationClient } from ".xmcp/clients"
// const result = await immigrationClient.tools.checkVisaStatus({ country: "UAE" })
```

This is unique — xmcp can both BE an MCP server and CONSUME other MCP servers.

---

## Monetization Plugins

| Plugin | Model | Mechanism |
|--------|-------|-----------|
| Polar | Subscription | License key validation |
| x402 | Pay-per-use | HTTP 402 cryptocurrency payments |

---

## Framework Adapters

### Embedded in Existing Apps

| Framework | Integration |
|-----------|------------|
| Next.js | Route handler in `app/mcp/route.ts` |
| Express | Middleware with custom endpoints |
| NestJS | Full module with DI and exception filters |

### Deployment Targets

Vercel, Cloudflare Workers, Replit, Smithery (MCP marketplace), Alpic (MCP analytics)

---

## What xmcp Is NOT

Important to clarify what xmcp does NOT provide:

- **No client-side React hooks** — no `useChat()`, `useTool()`, etc.
- **No chat UI components** — no Thread, Message, Composer primitives
- **No streaming responses** — tools return complete responses
- **No generative UI** — widgets are defined in code, not AI-selected
- **No thread/conversation management** — stateless tool execution
- **No human-in-the-loop** — no approval flows
- **No client-side state management** — state only within widget React components
- **No bidirectional state sync** — server → client only (via widget render)

---

## Unique Selling Points

1. **File-System Routing for MCP** — Drop a file, get a tool. Zero boilerplate registration.
2. **React Widget System** — Tools return interactive React components. `.ts` → `.tsx` and it works.
3. **MCP-Native** — Not an afterthought; the entire framework IS MCP.
4. **External Client Generation** — Consume other MCP servers with generated typed clients.
5. **Comprehensive Auth** — API keys, JWT, OAuth 2.1, Auth0, Better Auth — all built in.
6. **Monetization Built In** — Polar subscriptions + x402 crypto payments for tool access.
7. **Framework Embeddable** — Drop into Next.js, Express, or NestJS with one command.
8. **Production Deployment** — Vercel, Cloudflare Workers, Smithery marketplace.

---

## Strengths

- Lowest friction MCP server development (file-system routing + auto-registration)
- Widget system makes tools visual without a separate UI framework
- Auth system is the most complete of any framework analyzed
- External client generation enables MCP server composition
- Monetization plugins are unique in the space
- Strong deployment story (Vercel, Cloudflare, marketplace distribution)
- Active development (41 releases, 1,814 commits, 23 contributors)

## Weaknesses

- **Server-side only** — no client-side framework, no React hooks, no chat components
- **No streaming** — tools return complete responses, no progressive rendering
- **No human-in-the-loop** — no approval flows for sensitive tool executions
- **No generative UI** — widgets are statically defined, not AI-selected
- **MCP client dependency** — widgets only render in MCP-compatible clients (ChatGPT, Claude, etc.)
- **No thread management** — stateless, no conversation persistence
- **Widget state is isolated** — `useState` works within a widget, but no cross-widget or app-level state
- **STDIO not production-ready** — HTTP only for production deployments
- **Smaller community** — 1,200 stars vs assistant-ui's 8,500+

---

## Strategic Position

xmcp occupies a fundamentally different niche than the other frameworks:

```
CopilotKit     = Full-stack agentic app platform (client + server)
assistant-ui   = Client-side chat UI primitives
Tambo          = Generative UI toolkit (client + server)
TanStack AI    = Lightweight AI SDK (client + server)
Better UI      = Tool-first framework with views (client + server)
xmcp           = MCP SERVER framework with widgets (server only)
```

xmcp is not a competitor to these frameworks — it's **complementary**. You could use CopilotKit for your chat frontend and xmcp for your MCP tool backend. Or assistant-ui for the chat UI and xmcp for the tool server that assistant-ui's runtime connects to via MCP.

The most interesting integration pattern: **xmcp as the tool backend for any MCP-compatible frontend framework**. As MCP adoption grows, xmcp-built servers become the tools that CopilotKit, Tambo, and others consume.

---

## Summary

xmcp is the **best framework for building MCP servers** — the tool backends that AI applications connect to. Its file-system routing, React widget system, comprehensive auth, and deployment story make it the fastest path from "I have a tool idea" to "it's live and earning money." However, it's server-side only — you still need a frontend framework (CopilotKit, assistant-ui, etc.) to build the user-facing chat experience. For a company like Gullie, xmcp would be the **tool backend layer**, not the primary product framework.
