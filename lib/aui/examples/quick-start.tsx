import React from 'react';
import aui, { useAUITool } from '../index';
import { z } from 'zod';

// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    const response = await fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);

// Component to render search results
function SearchResults({ results }: { results: any[] }) {
  return (
    <div className="space-y-2">
      {results?.map((item) => (
        <div key={item.id} className="p-2 border rounded">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  );
}

// Using the tools in a component
export function ToolDemo() {
  const { execute, data, loading } = useAUITool(simpleTool);
  
  return (
    <div>
      <button onClick={() => execute({ city: 'NYC' })}>
        Get Weather
      </button>
      {loading && <div>Loading...</div>}
      {data && simpleTool.renderer({ data })}
    </div>
  );
}

// Direct execution (no React needed)
export async function directExecution() {
  const result = await simpleTool.run({ city: 'NYC' });
  console.log(result); // { temp: 72, city: 'NYC' }
}

// Export for use
export { simpleTool, complexTool };