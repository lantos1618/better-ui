# Contributing to Better UI

## Setup

```bash
git clone https://github.com/lantos1618/better-ui.git
cd better-ui
npm install
npm test
npm run build
npm run type-check
```

## Adding a Tool

Tools are defined using the `tool()` API in `src/tool.tsx`. A tool has an input schema (Zod), optional output schema, and chainable methods for server/client handlers and views:

```ts
import { tool } from '@lantos1618/better-ui';
import { z } from 'zod';

const myTool = tool({
  name: 'my_tool',
  description: 'Does something useful',
  input: z.object({ query: z.string() }),
  output: z.object({ result: z.string() }),
})
  .server(async (input, ctx) => {
    return { result: `Processed: ${input.query}` };
  })
  .view((data, state) => (
    <div>{data.result}</div>
  ));
```

Key chainable methods: `.server()`, `.client()`, `.stream()`, `.view()`.

## Adding a Component

Components live in `src/components/`. Each component is a single `.tsx` file.

1. Create `src/components/MyComponent.tsx`
2. Export it from `src/components/index.ts`:
   ```ts
   export { MyComponent } from './MyComponent';
   export type { MyComponentProps } from './MyComponent';
   ```
3. Add the build entry if it belongs to a new subpath export in `package.json`.

## Submitting a PR

- Run `npm test` and ensure all tests pass.
- Run `npm run type-check` with zero errors.
- Run `npm run build` to verify the build succeeds.
- Keep changes focused -- one concern per PR.
- Write tests for new functionality. Tests live in `src/__tests__/`.

## Code Style

- TypeScript throughout. Use strict types; avoid `any` unless at an API boundary.
- Prefer simple, readable code over clever abstractions.
- Use Zod for all runtime validation.
- Components must be `'use client'` where they use React hooks.
- Keep files small and single-purpose.
- Follow conventional commits for commit messages (`feat:`, `fix:`, `docs:`, `chore:`).
