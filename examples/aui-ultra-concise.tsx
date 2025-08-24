import aui from '@/lib/aui';
import { z } from 'zod';

// Ultra-concise: 2-line tool definition
const weather = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Even more concise with helper methods
const search = aui.simple(
  'search',
  z.object({ query: z.string() }),
  async (input) => ({ results: [`Result for ${input.query}`] }),
  (data) => <ul>{data.results.map(r => <li key={r}>{r}</li>)}</ul>
);

// One-liner with .do()
const calc = aui.tool('calc').do({
  input: z.object({ a: z.number(), b: z.number() }),
  execute: (input) => input.a + input.b,
  render: (sum) => <span>Result: {sum}</span>
});

// Client-optimized tool
const data = aui
  .tool('data')
  .input(z.object({ id: z.string() }))
  .execute(async ({ input }) => db.get(input.id))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.id);
    return cached || ctx.fetch(`/api/data/${input.id}`);
  })
  .render(({ data }) => <DataView {...data} />)
  .build();

// Batch definition for multiple tools
const tools = aui.defineTools({
  user: {
    input: z.object({ id: z.string() }),
    execute: async (input) => ({ id: input.id, name: 'John' }),
    render: (data) => <UserCard {...data} />
  },
  
  post: {
    input: z.object({ id: z.string() }),
    execute: async (input) => ({ id: input.id, title: 'Hello' }),
    client: async (input, ctx) => ctx.cache.get(`post:${input.id}`),
    render: (data) => <PostView {...data} />
  }
});

// AI-optimized tools with retry and caching
const aiTools = aui.aiTools({
  generate: {
    input: z.object({ prompt: z.string() }),
    execute: async (input) => ai.generate(input.prompt),
    retry: 3,
    cache: true,
    render: (text) => <GeneratedText content={text} />
  },
  
  analyze: {
    input: z.object({ text: z.string() }),
    execute: async (input) => ai.analyze(input.text),
    timeout: 30000,
    render: (analysis) => <AnalysisView {...analysis} />
  }
});

// Ultra-concise syntax with shortcuts
const quick = aui.t('quick')
  .i(z.object({ msg: z.string() }))
  .e(input => `Echo: ${input.msg}`)
  .r(text => <p>{text}</p>)
  .b();

// Context-aware tool
const session = aui.contextual(
  'session',
  z.object({ action: z.string() }),
  async ({ input, ctx }) => ({
    user: ctx.user,
    action: input.action,
    timestamp: Date.now()
  }),
  (data) => <SessionInfo {...data} />
);

export { weather, search, calc, data, tools, aiTools, quick, session };