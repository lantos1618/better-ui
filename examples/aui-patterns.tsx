import aui, { z } from '@/lib/aui';

// ============================================
// MINIMAL API - Just what you asked for
// ============================================

// 1. Simple tool - 2 methods minimum
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }));

// 2. With rendering
const weatherWithUI = aui
  .tool('weather-ui')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// 3. Complex tool with client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server: database query
    return await db.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client: cache + offline support
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      body: JSON.stringify(input) 
    });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => <SearchResults results={data} />);

// ============================================
// SHORTHAND METHODS (for even more conciseness)
// ============================================

// Ultra-simple: no input
aui.do('time', () => new Date().toISOString());

// Simple with input
aui.doWith('greet', 
  z.object({ name: z.string() }), 
  ({ name }) => `Hello, ${name}!`
);

// Standard simple tool
aui.simple('weather',
  z.object({ city: z.string() }),
  async (input) => ({ temp: 72, city: input.city }),
  (data) => <div>{data.city}: {data.temp}°</div>
);

// AI-optimized with retry & cache
aui.ai('smart-search', {
  input: z.object({ q: z.string() }),
  execute: async ({ input }) => apiSearch(input.q),
  retry: 3,
  cache: true,
  render: ({ data }) => <Results items={data} />
});

// ============================================
// USAGE IN COMPONENTS
// ============================================

function MyComponent() {
  // Direct execution
  const handleWeather = async () => {
    const result = await weatherTool.run({ city: 'NYC' });
    console.log(result); // { temp: 72, city: 'NYC' }
  };

  // With context for caching
  const handleSearch = async () => {
    const ctx = aui.createContext();
    const result = await searchTool.run({ query: 'AI' }, ctx);
    return result;
  };

  // Render result
  const [data, setData] = useState(null);
  return data && weatherWithUI.renderResult(data);
}

// ============================================
// BATCH DEFINITION
// ============================================

const tools = aui.defineTools({
  calculator: {
    input: z.object({ a: z.number(), b: z.number() }),
    execute: ({ input }) => ({ result: input.a + input.b })
  },
  translator: {
    input: z.object({ text: z.string(), to: z.string() }),
    execute: async ({ input }) => translate(input.text, input.to),
    render: ({ data }) => <Translation text={data} />
  }
});

// Use: tools.calculator.run({ a: 1, b: 2 })

// ============================================
// REGISTRY & MANAGEMENT
// ============================================

// Check if tool exists
if (aui.has('weather')) {
  const tool = aui.get('weather');
}

// Execute by name
const result = await aui.execute('weather', { city: 'NYC' });

// List all tools
const allTools = aui.getToolNames(); // ['weather', 'search', ...]