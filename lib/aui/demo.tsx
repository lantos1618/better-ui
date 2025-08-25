import aui from './index';
import { z } from 'zod';

// ============================================
// EXACT API AS REQUESTED BY USER
// ============================================

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
    // Mock database search
    return { results: [`Result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
  })
  .render(({ data }) => <SearchResults results={data} />);

// Component for rendering search results
function SearchResults({ results }: { results: any }) {
  return (
    <div>
      {results.results?.map((r: string, i: number) => (
        <div key={i}>{r}</div>
      ))}
    </div>
  );
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Direct execution
async function exampleUsage() {
  const ctx = aui.createContext();
  
  // Execute weather tool
  const weatherResult = await simpleTool.run({ city: 'Tokyo' }, ctx);
  console.log(weatherResult); // { temp: 72, city: 'Tokyo' }
  
  // Execute search tool
  const searchResult = await complexTool.run({ query: 'AI tools' }, ctx);
  console.log(searchResult); // { results: ['Result for AI tools'] }
}

// React component usage
import { useAUITool } from './hooks/useAUITool';

export function WeatherWidget() {
  const { execute, data, loading } = useAUITool(simpleTool);
  
  return (
    <div>
      <button onClick={() => execute({ city: 'Tokyo' })}>
        Get Weather
      </button>
      {loading && <span>Loading...</span>}
      {data && simpleTool.renderer && simpleTool.renderer({ data })}
    </div>
  );
}

// AI Agent can discover and use tools
export function getToolsForAI() {
  return aui.getTools().map(tool => ({
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
    execute: (input: any) => tool.run(input)
  }));
}

export { simpleTool, complexTool };