'use client';

import aui from '@/lib/aui/lantos-concise';
import { z } from 'zod';
import React from 'react';

// Simple tool - just 2 methods (your exact example)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization (your exact example)
const complexTool = aui
  .tool('search')
  .description('Search with client-side caching')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: database search
    return { results: [`Server result for: ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/aui/lantos-execute', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    }).then(r => r.json()).then(r => r.data);
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .cache(60000) // Cache for 1 minute
  .retry(3) // Retry 3 times on failure
  .render(({ data, loading, error }) => {
    if (loading) return <div>Searching...</div>;
    if (error) return <div>Error: {error.message}</div>;
    return (
      <div className="search-results">
        {data.results?.map((r: string, i: number) => (
          <div key={i}>{r}</div>
        ))}
      </div>
    );
  });

// AI-optimized tool with advanced features
const aiTool = aui
  .tool('ai-assistant')
  .description('AI assistant for code generation')
  .input(z.object({ 
    prompt: z.string(),
    language: z.enum(['typescript', 'python', 'rust']).optional()
  }))
  .execute(async ({ input, ctx }) => {
    // Server-side AI processing
    return { 
      code: `// Generated code for: ${input.prompt}`,
      language: input.language || 'typescript'
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with smart caching
    const cacheKey = `ai:${input.prompt}:${input.language}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/aui/lantos-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tool: 'ai-assistant', 
        input,
        context: { aiAgent: ctx.aiAgent }
      })
    }).then(r => r.json()).then(r => r.data);
    
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .cache(300000) // Cache for 5 minutes
  .retry(2)
  .timeout(10000) // 10 second timeout
  .render(({ data }) => (
    <pre className="bg-gray-900 text-green-400 p-4 rounded">
      <code>{data.code}</code>
    </pre>
  ));

// More examples showing the power of the API
const calculator = aui
  .tool('calculator')
  .description('Simple calculator for basic operations')
  .input(z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }))
  .execute(async ({ input }) => {
    const ops = {
      '+': (a: number, b: number) => a + b,
      '-': (a: number, b: number) => a - b,
      '*': (a: number, b: number) => a * b,
      '/': (a: number, b: number) => a / b,
    };
    return { result: ops[input.op](input.a, input.b) };
  })
  .render(({ data }) => <span className="text-2xl font-bold">{data.result}</span>);

// Database tool with full-stack optimization
const databaseTool = aui
  .tool('database')
  .description('Query database with automatic caching')
  .input(z.object({ 
    table: z.string(),
    operation: z.enum(['find', 'create', 'update', 'delete']),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side database operations
    switch(input.operation) {
      case 'find':
        return { records: [{ id: 1, name: 'Sample' }] };
      case 'create':
        return { id: Date.now(), ...input.data };
      default:
        return { success: true };
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only cache read operations
    if (input.operation === 'find') {
      const cacheKey = `db:${input.table}:find`;
      const cached = ctx.cache.get(cacheKey);
      if (cached) return cached;
    }
    
    const result = await ctx.fetch('/api/aui/lantos-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'database', input })
    }).then(r => r.json()).then(r => r.data);
    
    if (input.operation === 'find') {
      ctx.cache.set(`db:${input.table}:find`, result);
    }
    return result;
  })
  .cache(30000) // Cache reads for 30 seconds
  .retry(2)
  .render(({ data }) => (
    <div className="database-result p-4 bg-gray-100 rounded">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// Register tools for global access
aui.register(simpleTool);
aui.register(complexTool);
aui.register(aiTool);
aui.register(calculator);
aui.register(databaseTool);

// Demo component
export default function LantosAUIConciseDemo() {
  const [weatherData, setWeatherData] = React.useState<any>(null);
  const [searchData, setSearchData] = React.useState<any>(null);
  const [aiData, setAiData] = React.useState<any>(null);
  const [calcData, setCalcData] = React.useState<any>(null);
  const [dbData, setDbData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const runExamples = async () => {
    setLoading(true);
    try {
      // Run simple tool
      const weather = await simpleTool.run({ city: 'San Francisco' });
      setWeatherData(weather);

      // Run complex tool with caching
      const search = await complexTool.run({ query: 'Next.js AUI' });
      setSearchData(search);

      // Run AI tool
      const ai = await aiTool.run({ 
        prompt: 'Create a React hook for form validation',
        language: 'typescript'
      });
      setAiData(ai);

      // Run calculator
      const calc = await calculator.run({ a: 10, b: 5, op: '+' });
      setCalcData(calc);

      // Run database tool
      const db = await databaseTool.run({ 
        table: 'users',
        operation: 'find'
      });
      setDbData(db);

      // Demonstrate batch execution
      const batchResults = await aui.batch([
        { tool: 'weather', input: { city: 'New York' } },
        { tool: 'calculator', input: { a: 100, b: 50, op: '*' } }
      ]);
      console.log('Batch results:', batchResults);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Lantos AUI - Concise API</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="font-semibold mb-2">Features:</h2>
        <ul className="list-disc ml-6 text-sm">
          <li>Fluent API - chain methods naturally</li>
          <li>Server/Client execution separation</li>
          <li>Built-in caching with TTL</li>
          <li>Automatic retry with exponential backoff</li>
          <li>Timeout handling</li>
          <li>AI agent context support</li>
          <li>Batch execution</li>
        </ul>
      </div>
      
      <button 
        onClick={runExamples}
        disabled={loading}
        className="bg-blue-500 text-white px-6 py-3 rounded mb-6 hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Running...' : 'Run All Examples'}
      </button>

      <div className="space-y-6">
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Simple Tool - Weather</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm mb-4">
{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}
          </pre>
          {weatherData && simpleTool.render({ data: weatherData })}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Complex Tool - Search with Client Caching</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm mb-4">
{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}
          </pre>
          {searchData && complexTool.render({ data: searchData })}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">AI Assistant</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm mb-4">
{`const aiTool = aui
  .tool('ai-assistant')
  .input(z.object({ prompt: z.string() }))
  .execute(async ({ input }) => generateCode(input))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.prompt);
    return cached || ctx.fetch('/api/ai', { body: input });
  })
  .cache(300000)  // 5 minutes
  .retry(2)
  .timeout(10000) // 10 seconds
  .render(({ data }) => <CodeBlock code={data.code} />)`}
          </pre>
          {aiData && aiTool.render({ data: aiData })}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Calculator</h2>
          {calcData && (
            <div>10 + 5 = {calculator.render({ data: calcData })}</div>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Database Tool</h2>
          {dbData && databaseTool.render({ data: dbData })}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Tool Registry</h2>
          <p className="text-sm text-gray-600 mb-2">All registered tools are discoverable by AI agents:</p>
          <pre className="bg-gray-100 p-2 rounded text-xs">
{JSON.stringify(aui.list(), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}