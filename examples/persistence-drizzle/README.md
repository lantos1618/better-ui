# Persistence Example: Drizzle + SQLite

Shows how to add chat persistence to better-ui using [Drizzle ORM](https://orm.drizzle.team/) and SQLite.

> **This is an example, not a requirement.** better-ui is unopinionated about persistence — it doesn't dictate how or where you store data. This example demonstrates one approach using Drizzle + SQLite. You're free to use any ORM, database, or storage layer that fits your stack.

## Prerequisites

- Node.js 18+
- An OpenAI API key

## Setup

```bash
cd examples/persistence-drizzle
npm install

# Push the schema to SQLite (creates sqlite.db)
npx drizzle-kit push

# Start the dev server
OPENAI_API_KEY=sk-... npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to use the app.

## What's Included

- **Thread management** — Create, list, and delete chat threads
- **Message persistence** — All user and assistant messages are saved to SQLite
- **Tool call tracking** — Tool invocations and their results are stored
- **Auto-titling** — Threads are automatically titled from the first message

## Schema Overview

Three tables in `src/db/schema.ts`:

| Table | Purpose |
|-------|---------|
| `threads` | Chat threads with title and timestamps |
| `messages` | User and assistant messages, linked to a thread |
| `tool_calls` | Tool invocations with input/output JSON, linked to a message |

## Adapting This Example

This is a starting point. Some ideas:

- **Swap the database** — Replace SQLite with Postgres by changing the Drizzle dialect and driver
- **Swap the ORM** — Use Prisma, Kysely, or raw SQL instead of Drizzle
- **Add authentication** — Scope threads to users with a `userId` column
- **Add search** — Use SQLite FTS5 or Postgres full-text search on message content
- **Add branching** — Store a `parentMessageId` to support conversation branching
