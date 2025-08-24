import aui, { z } from '../index';

// =============================================================================
// ULTRA-CONCISE TOOL EXAMPLES
// =============================================================================

// -----------------------------------------------------------------------------
// 1. SIMPLE TOOL - Just 2 methods (input + execute)
// -----------------------------------------------------------------------------
export const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// -----------------------------------------------------------------------------
// 2. COMPLEX TOOL - With client-side optimization
// -----------------------------------------------------------------------------
export const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    const results = await fetch(`/api/search?q=${input.query}`);
    return results.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first for performance
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    // Fetch and cache
    const result = await ctx.fetch('/api/tools/search', { body: input });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();

// -----------------------------------------------------------------------------
// 3. ONE-LINER TOOLS - Maximum conciseness
// -----------------------------------------------------------------------------
export const pingTool = aui.do('ping', () => 'pong');

export const timeTool = aui.do('time', () => new Date().toISOString());

export const randomTool = aui.do('random', () => Math.random());

// -----------------------------------------------------------------------------
// 4. USING SHORTHAND ALIASES
// -----------------------------------------------------------------------------
export const mathTool = aui
  .t('math')                                    // t = tool
  .i(z.object({ a: z.number(), b: z.number() })) // i = input  
  .e((input: { a: number; b: number }) => input.a + input.b)  // e = execute
  .r((sum: number) => <span>{sum}</span>)        // r = render
  .b();                                           // b = build

// -----------------------------------------------------------------------------
// 5. AI-OPTIMIZED TOOLS - With retry and caching
// -----------------------------------------------------------------------------
export const aiTool = aui.ai('smartQuery', {
  input: z.object({ prompt: z.string() }),
  execute: async ({ prompt }: { prompt: string }) => {
    // Potentially flaky AI API
    const response = await fetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    return response.json();
  },
  render: ({ data }: any) => <AIResponse response={data} />,
  retry: 3,      // Retry up to 3 times
  cache: true,   // Cache responses
  timeout: 5000  // 5 second timeout
});

// -----------------------------------------------------------------------------
// 6. BATCH DEFINITION - Define multiple related tools
// -----------------------------------------------------------------------------
export const crudTools = aui.defineTools({
  create: {
    input: z.object({ name: z.string() }),
    execute: async ({ name }: { name: string }) => ({ id: Date.now(), name }),
    render: ({ id, name }: any) => <div>Created: {name} (#{id})</div>
  },
  
  read: {
    input: z.object({ id: z.number() }),
    execute: async ({ id }: { id: number }) => ({ id, name: 'Example' }),
    render: ({ name }: any) => <div>{name}</div>
  },
  
  update: {
    input: z.object({ id: z.number(), name: z.string() }),
    execute: async ({ id, name }: { id: number; name: string }) => ({ id, name, updated: true }),
    render: () => <div>Updated!</div>
  },
  
  delete: {
    input: z.object({ id: z.number() }),
    execute: async ({ id }: { id: number }) => ({ deleted: id }),
    render: ({ deleted }: any) => <div>Deleted #{deleted}</div>
  }
});

// -----------------------------------------------------------------------------
// 7. USING .simple() HELPER
// -----------------------------------------------------------------------------
export const greetTool = aui.simple(
  'greet',
  z.object({ name: z.string(), greeting: z.string().optional() }),
  ({ name, greeting = 'Hello' }) => `${greeting}, ${name}!`,
  message => <h2>{message}</h2>
);

// -----------------------------------------------------------------------------
// 8. CONTEXTUAL TOOLS - Access shared context
// -----------------------------------------------------------------------------
export const stateTool = aui.contextual(
  'state',
  z.object({ key: z.string(), value: z.any().optional() }),
  async ({ input, ctx }) => {
    if (input.value !== undefined) {
      ctx.state.set(input.key, input.value);
      return { action: 'set', key: input.key, value: input.value };
    }
    return { action: 'get', key: input.key, value: ctx.state.get(input.key) };
  },
  ({ action, key, value }) => (
    <div>State[{key}] {action === 'set' ? '=' : ':'} {JSON.stringify(value)}</div>
  )
);

// -----------------------------------------------------------------------------
// 9. SERVER-ONLY TOOLS - No client execution
// -----------------------------------------------------------------------------
export const dbTool = aui.server(
  'database',
  z.object({ sql: z.string() }),
  async ({ sql }: { sql: string }) => {
    // This only runs on server
    console.log('Executing SQL:', sql);
    return { rows: [], query: sql };
  },
  ({ query }: any) => <code>{query}</code>
);

// -----------------------------------------------------------------------------
// 10. QUICK MODE - Auto-build after execute and render
// -----------------------------------------------------------------------------
export const quickTool = aui
  .quick('fast')
  .input(z.object({ value: z.number() }))
  .execute(({ value }: { value: number }) => value * 2)
  .render((result: number) => <span>{result}</span>);
  // No need to call .build() - automatically built!

// -----------------------------------------------------------------------------
// Components used in examples
// -----------------------------------------------------------------------------
function SearchResults({ results }: { results: any[] }) {
  return (
    <ul>
      {results.map((r, i) => (
        <li key={i}>{r.title}</li>
      ))}
    </ul>
  );
}

function AIResponse({ response }: { response: any }) {
  return <div className="ai-response">{response.text}</div>;
}