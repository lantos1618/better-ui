# AUI Implementation Scratchpad

## Working Notes

### Current Focus
Implementing the core AUI builder pattern with the requested API:
```tsx
// Simple tool - just 2 methods
aui.tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)

// Complex tool - adds client optimization
aui.tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
```

### Implementation Checklist
- [ ] Create core types in lib/aui/types.ts
- [ ] Build fluent builder in lib/aui/builder.ts
- [ ] Add tool registry in lib/aui/registry.ts
- [ ] Create server executor
- [ ] Add client utilities
- [ ] Build example tools
- [ ] Add tests

### Key Design Decisions
1. Use Zod for runtime validation
2. Fluent/chainable API
3. Type inference throughout
4. Optional client execution
5. Built-in React rendering