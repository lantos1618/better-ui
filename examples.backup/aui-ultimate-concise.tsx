import React from 'react';
import aui, { z } from '@/lib/aui';

// ======================================
// ULTRA CONCISE EXAMPLES
// ======================================

// 1️⃣ Simplest: One-liner with aui.simple()
const weatherTool = aui.simple(
  'weather',
  z.object({ city: z.string() }),
  async (input) => ({ temp: 72, city: input.city }),
  (data) => <div>{data.city}: {data.temp}°</div>
);

// 2️⃣ Quick mode: Auto-builds after render
const greetingTool = aui
  .quick('greeting')
  .input(z.object({ name: z.string() }))
  .execute((input) => `Hello, ${input.name}!`)
  .render((data) => <h1>{data}</h1>); // Auto-builds here!

// 3️⃣ Using .run() for execute + render combo
const calcTool = aui
  .tool('calculator')
  .input(z.object({ a: z.number(), b: z.number() }))
  .run(
    (input) => input.a + input.b,
    (result) => <span>Result: {result}</span>
  )
  .build();

// 4️⃣ Using .handle() for input + execute combo
const stockTool = aui
  .tool('stock')
  .handle(
    z.object({ ticker: z.string() }),
    async (input) => ({ ticker: input.ticker, price: Math.random() * 1000 })
  )
  .render(({ ticker, price }) => <div>{ticker}: ${price.toFixed(2)}</div>)
  .build();

// 5️⃣ Server-only with aui.server()
const dbWriteTool = aui.server(
  'db-write',
  z.object({ table: z.string(), data: z.record(z.any()) }),
  async (input) => ({ id: Date.now(), ...input.data }),
  (data) => <div>Created record #{data.id}</div>
);

// 6️⃣ Context-aware with aui.contextual()
const userTool = aui.contextual(
  'user-info',
  z.object({ userId: z.string().optional() }),
  async ({ input, ctx }) => {
    const id = input.userId || ctx.userId || 'anonymous';
    return { id, name: `User ${id}`, lastSeen: new Date() };
  },
  (user) => <div>{user.name} (ID: {user.id})</div>
);

// ======================================
// COMPLEX TOOL WITH CLIENT OPTIMIZATION
// ======================================

const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10),
    filters: z.object({
      category: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
    }).optional()
  }))
  .execute(async ({ input }) => {
    // Server-side: Complex database query
    console.log('Server search:', input);
    return {
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        price: Math.random() * 1000,
        category: ['Electronics', 'Books', 'Clothing'][i % 3]
      })),
      totalCount: 100,
      query: input.query
    };
  })
  .client(async ({ input, ctx }) => {
    // Client-side: Check cache first
    const cacheKey = JSON.stringify(input);
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log('Using cached results');
      return cached.data;
    }
    
    // Fetch from server
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    // Cache the result
    ctx.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  })
  .render(({ data }) => (
    <div className="search-results">
      <h3>Found {data.totalCount} results for "{data.query}"</h3>
      <ul>
        {data.results.map((item) => (
          <li key={item.id}>
            <strong>{item.title}</strong>
            <span> - ${item.price.toFixed(2)}</span>
            <span> ({item.category})</span>
          </li>
        ))}
      </ul>
    </div>
  ))
  .build();

// ======================================
// CHAINING TOOLS TOGETHER
// ======================================

// Tool that uses another tool's output
const weatherForecastTool = aui
  .tool('weather-forecast')
  .input(z.object({ city: z.string(), days: z.number().default(7) }))
  .execute(async ({ input }) => {
    // First get current weather
    const current = await weatherTool.execute({ 
      input: { city: input.city },
      ctx: { cache: new Map(), fetch: fetch as any }
    });
    
    // Generate forecast
    const forecast = Array.from({ length: input.days }, (_, i) => ({
      day: i,
      temp: current.temp + (Math.random() - 0.5) * 10,
      conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
    }));
    
    return { city: input.city, current, forecast };
  })
  .render(({ data }) => (
    <div className="forecast">
      <h3>{data.city} Weather Forecast</h3>
      <div>Current: {data.current.temp}°</div>
      <ul>
        {data.forecast.map((day) => (
          <li key={day.day}>
            Day {day.day + 1}: {day.temp.toFixed(1)}° - {day.conditions}
          </li>
        ))}
      </ul>
    </div>
  ))
  .build();

// ======================================
// AI AGENT TOOLS WITH DESCRIPTIONS
// ======================================

const aiTools = [
  aui
    .tool('translate')
    .description('Translate text between languages using AI')
    .input(z.object({
      text: z.string(),
      from: z.string().default('auto'),
      to: z.string()
    }))
    .execute(async ({ input }) => ({
      original: input.text,
      translated: `[Translated to ${input.to}]: ${input.text}`,
      from: input.from,
      to: input.to
    }))
    .render(({ data }) => (
      <div className="translation">
        <div>Original ({data.from}): {data.original}</div>
        <div>Translation ({data.to}): {data.translated}</div>
      </div>
    ))
    .build(),

  aui
    .tool('summarize')
    .description('Summarize long text into key points')
    .input(z.object({
      text: z.string(),
      maxPoints: z.number().default(3)
    }))
    .execute(async ({ input }) => ({
      points: Array.from({ length: input.maxPoints }, (_, i) => 
        `Key point ${i + 1} from the text`
      ),
      wordCount: input.text.split(' ').length
    }))
    .render(({ data }) => (
      <div className="summary">
        <p>Summary ({data.wordCount} words):</p>
        <ul>
          {data.points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>
    ))
    .build()
];

// Register all AI tools
aiTools.forEach(tool => aui.register(tool));

// ======================================
// USAGE IN REACT COMPONENT
// ======================================

export function AUIDemo() {
  const [results, setResults] = React.useState<Record<string, any>>({});
  
  const runTool = async (toolName: string, input: any) => {
    const tool = aui.getTool(toolName);
    if (!tool) return;
    
    const result = await tool.execute({
      input,
      ctx: {
        cache: new Map(),
        fetch: fetch as any,
        userId: 'user123',
        sessionId: 'session456'
      }
    });
    
    setResults(prev => ({ ...prev, [toolName]: result }));
  };

  return (
    <div className="aui-demo">
      <h1>🚀 AUI Ultimate Concise API Demo</h1>
      
      <section>
        <h2>Simple Tools</h2>
        <button onClick={() => runTool('weather', { city: 'San Francisco' })}>
          Get Weather
        </button>
        {results.weather && weatherTool.render?.({ 
          data: results.weather, 
          input: { city: 'San Francisco' }
        })}
      </section>

      <section>
        <h2>Complex Search</h2>
        <button onClick={() => runTool('search', { 
          query: 'laptop',
          limit: 5,
          filters: { category: 'Electronics', minPrice: 500 }
        })}>
          Search Products
        </button>
        {results.search && searchTool.render?.({ 
          data: results.search, 
          input: { query: 'laptop', limit: 5 }
        })}
      </section>

      <section>
        <h2>AI Tools</h2>
        <button onClick={() => runTool('translate', { 
          text: 'Hello world',
          to: 'Spanish'
        })}>
          Translate to Spanish
        </button>
        {results.translate && aiTools[0].render?.({ 
          data: results.translate, 
          input: { text: 'Hello world', from: 'auto', to: 'Spanish' }
        })}
      </section>
    </div>
  );
}

// ======================================
// EXPORT ALL TOOLS FOR TESTING
// ======================================

export const tools = {
  weatherTool,
  greetingTool,
  calcTool,
  stockTool,
  dbWriteTool,
  userTool,
  searchTool,
  weatherForecastTool,
  aiTools
};