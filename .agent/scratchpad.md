# Lantos AUI Scratchpad

## Current Focus
Enhancing the AUI API to be even more concise and elegant while maintaining full functionality.

## Ideas for Improvement

### 1. Ultra-Short Syntax
```tsx
// Current
aui.tool('weather').input(z.object({city: z.string()})).execute(handler)

// Could be even shorter with:
aui.do('weather', {city: 'SF'}, async () => ({temp: 72}))
```

### 2. Batch Tool Definition
```tsx
aui.defineTools({
  weather: { input: schema, execute: handler },
  search: { input: schema, execute: handler, clientExecute: clientHandler }
})
```

### 3. AI-Optimized Tools
```tsx
aui.ai('search', {
  input: schema,
  execute: handler,
  retry: 3,
  cache: true,
  timeout: 5000
})
```

### 4. Type Inference Magic
```tsx
// Infer input type from execute function
const tool = aui.tool('test')
  .execute(async ({input}: {input: {name: string}}) => ({result: input.name}))
// Input type automatically inferred!
```

## Implementation Checklist
- [✅] Core types and interfaces
- [✅] Fluent builder pattern
- [✅] Tool registry with auto-registration
- [✅] Server executor
- [✅] Client utilities and hooks
- [🔄] Enhanced shorthand methods
- [🔄] Comprehensive tests

## Performance Considerations
- Cache tool definitions to avoid recreation
- Use WeakMap for context storage
- Implement connection pooling for DB tools
- Add request deduplication

## Notes
- Clean up duplicate files
- Consider middleware support
- Add error boundaries for React components
- Implement telemetry hooks