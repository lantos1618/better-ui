# AUI Development Scratchpad

## Quick Notes
- Branch: lantos-aui
- Main focus: Ultra-concise API for AI control
- Key principle: Simplicity > Features

## Code Patterns Discovered

### Current Implementation
```tsx
// Simple pattern works well
aui.tool('name')
  .input(schema)
  .execute(handler)
  .render(component)
  .build()

// AI-optimized pattern is good
aui.ai('name', {
  input: schema,
  execute: handler,
  retry: 3,
  cache: true
})
```

### Areas to Verify
1. Client execution with context
2. Registry persistence
3. Type inference through chain
4. Error handling in executors

## Testing Ideas
- Mock AI calling tools
- Verify client/server split
- Test error recovery
- Validate type safety

## Performance Considerations
- Lazy load client executors
- Cache tool definitions
- Minimize bundle size
- Tree-shake unused tools

## Questions to Address
- How does AI discover available tools?
- Should tools self-document?
- Can tools compose/chain?
- How to handle auth in tools?

## Cleanup Tasks
- Remove debug console.logs
- Optimize imports
- Tree-shake unused code
- Minify production bundle