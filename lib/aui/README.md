# AUI (Assistant-UI) System

A concise and elegant tool system for Next.js that enables AI assistants to control both frontend and backend through tool calls.

## Core API

### Simple Tool (2 methods)
```tsx
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
```

### Complex Tool (with client optimization)
```tsx
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
```

## Features

- **Concise API**: Chain methods without `.build()` - tools are ready to use immediately
- **Type Safety**: Full TypeScript support with Zod schemas
- **Client/Server Execution**: Optimize for performance with separate execution paths
- **React Rendering**: Built-in component rendering for tools
- **Context System**: Share cache, fetch, and session data across tools
- **No Build Step**: Tools return themselves, ready to use

## Usage

### Using the Hook
```tsx
import { useAUITool } from '@/lib/aui/components/ToolRenderer';

function MyComponent() {
  const weather = useAUITool(weatherTool);
  
  return (
    <div>
      <button onClick={() => weather.execute({ city: 'NYC' })}>
        Get Weather
      </button>
      {weather.data && weatherTool.renderer?.({ data: weather.data })}
    </div>
  );
}
```

### Using the Renderer Component
```tsx
import { ToolRenderer } from '@/lib/aui/components/ToolRenderer';

function MyComponent() {
  return (
    <ToolRenderer
      tool={weatherTool}
      input={{ city: 'San Francisco' }}
      autoExecute={true}
    />
  );
}
```

## Examples

See `/lib/aui/examples/` for complete examples:
- Weather tool (simple with render)
- Search tool (with caching and render)
- Calculator tool (with render)
- Data fetcher (with deduplication)