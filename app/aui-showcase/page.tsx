'use client';

import { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Ultra-concise tool definitions for AI control

// 1. Simple tool - minimal setup, server-only execution
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }: { input: { city: string } }) => {
    // Simulate API call
    await new Promise((r: any) => setTimeout(r, 500));
    return { 
      temp: Math.floor(Math.random() * 30) + 50,
      city: input.city,
      conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
    };
  })
  .render(({ data }: { data: any }) => (
    <div className="p-4 bg-blue-50 rounded">
      <h3 className="font-bold">{data.city}</h3>
      <p>{data.temp}°F - {data.conditions}</p>
    </div>
  ))
  .build();

// 2. Complex tool with client-side optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }: { input: { query: string; limit?: number } }) => {
    // Server-side database search
    console.log('Server search:', input);
    await new Promise((r: any) => setTimeout(r, 800));
    return {
      results: Array.from({ length: input.limit || 10 }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        score: Math.random()
      })).sort((a: any, b: any) => b.score - a.score)
    };
  })
  .clientExecute(async ({ input, ctx }: { input: { query: string; limit?: number }; ctx: any }) => {
    // Check client cache first
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache?.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log('Using cached results');
      return cached.data;
    }
    
    // Fall back to server
    const result = await ctx.fetch('/api/aui/search', { 
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    // Cache the result
    ctx.cache?.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  })
  .render(({ data }: { data: any }) => (
    <div className="space-y-2">
      {data.results.map((r: any) => (
        <div key={r.id} className="p-2 bg-gray-50 rounded">
          <span className="font-medium">{r.title}</span>
          <span className="ml-2 text-sm text-gray-500">
            Score: {r.score.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  ))
  .build();

// 3. Ultra-concise one-liner tools using helper methods
const dbQueryTool = aui.simple(
  'dbQuery',
  z.object({ sql: z.string() }),
  async (input: { sql: string }) => ({ rows: [`Mock result for: ${input.sql}`] }),
  (data: any) => <pre className="p-2 bg-black text-green-400">{data.rows.join('\n')}</pre>
);

// 4. AI-optimized tool with retry and caching
const analyticsTool = aui.ai('analytics', {
  input: z.object({
    metric: z.enum(['users', 'revenue', 'engagement']),
    period: z.enum(['day', 'week', 'month'])
  }),
  execute: async (input: { metric: string; period: string }) => {
    // Simulate flaky API that might fail
    if (Math.random() > 0.7) {
      throw new Error('API temporarily unavailable');
    }
    
    return {
      metric: input.metric,
      period: input.period,
      value: Math.floor(Math.random() * 10000),
      trend: Math.random() > 0.5 ? 'up' : 'down'
    };
  },
  render: (data: any) => (
    <div className="p-4 border rounded">
      <h4 className="font-bold capitalize">{data.metric}</h4>
      <p className="text-2xl">{data.value.toLocaleString()}</p>
      <p className="text-sm">
        {data.period} - Trend: {data.trend === 'up' ? '📈' : '📉'}
      </p>
    </div>
  ),
  retry: 3,
  cache: true
});

// 5. Batch tool definition for related operations
const crudTools = aui.defineTools({
  createUser: {
    input: z.object({ name: z.string(), email: z.string() }),
    execute: async (input: { name: string; email: string }) => ({ id: Date.now(), ...input }),
    render: (data: any) => <div>Created user #{data.id}: {data.name}</div>
  },
  
  updateUser: {
    input: z.object({ id: z.number(), updates: z.record(z.any()) }),
    execute: async (input: { id: number; updates: any }) => ({ success: true, ...input }),
    render: (data: any) => <div>Updated user #{data.id}</div>
  },
  
  deleteUser: {
    input: z.object({ id: z.number() }),
    execute: async (input: { id: number }) => ({ deleted: true, id: input.id }),
    render: (data: any) => <div>Deleted user #{data.id}</div>
  }
});

// 6. Context-aware tool for complex state management
const stateTool = aui.contextual(
  'stateManager',
  z.object({ 
    action: z.enum(['get', 'set', 'update']),
    key: z.string(),
    value: z.any().optional()
  }),
  async ({ input, ctx }: { input: { action: string; key: string; value?: any }; ctx: any }) => {
    const state = ctx.state || new Map();
    
    switch (input.action) {
      case 'get':
        return { value: state.get(input.key) };
      case 'set':
        state.set(input.key, input.value);
        return { updated: true, value: input.value };
      case 'update':
        const current = state.get(input.key);
        const updated = { ...current, ...input.value };
        state.set(input.key, updated);
        return { updated: true, value: updated };
    }
  },
  (data: any) => (
    <div className="font-mono text-sm">
      {data.updated ? '✓ Updated: ' : 'Value: '}
      {JSON.stringify(data.value, null, 2)}
    </div>
  )
);

// Register all tools
[weatherTool, searchTool, dbQueryTool, analyticsTool, stateTool]
  .forEach(tool => aui.register(tool));

Object.values(crudTools).forEach(tool => aui.register(tool));

export default function AUIShowcase() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const executeTool = async (toolName: string, input: any) => {
    setLoading(true);
    try {
      const tool = aui.getTool(toolName);
      if (!tool) throw new Error(`Tool ${toolName} not found`);
      
      // Execute the tool
      const result = await tool.execute({ input, ctx: { 
        cache: new Map(),
        fetch: async (url: string, options: any) => {
          const res = await fetch(url, {
            ...options,
            headers: { 'Content-Type': 'application/json' }
          });
          return res.json();
        }
      }} as any);
      
      // Add to results with rendered output
      setResults(prev => [...prev, {
        tool: toolName,
        input,
        output: result,
        rendered: tool.render ? tool.render({ data: result, input }) : null
      }]);
    } catch (error: any) {
      console.error('Tool execution failed:', error);
      setResults(prev => [...prev, {
        tool: toolName,
        input,
        error: error.message || 'Unknown error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    { tool: 'weather', input: { city: 'San Francisco' } },
    { tool: 'search', input: { query: 'AI tools', limit: 5 } },
    { tool: 'dbQuery', input: { sql: 'SELECT * FROM users LIMIT 10' } },
    { tool: 'analytics', input: { metric: 'revenue', period: 'month' } },
    { tool: 'createUser', input: { name: 'Alice', email: 'alice@example.com' } },
    { tool: 'stateManager', input: { action: 'set', key: 'user', value: { name: 'Bob' } } }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AUI - AI Control Interface</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tool Execution Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Execute Tools</h2>
            <div className="space-y-3">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => executeTool(ex.tool, ex.input)}
                  disabled={loading}
                  className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                >
                  <div className="font-medium">{ex.tool}</div>
                  <div className="text-sm text-gray-600">
                    {JSON.stringify(ex.input)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="border-b pb-4">
                  <div className="text-sm font-medium text-gray-500 mb-2">
                    {r.tool} → {r.error ? '❌ Error' : '✅ Success'}
                  </div>
                  {r.error ? (
                    <div className="text-red-500 text-sm">{r.error}</div>
                  ) : (
                    <div>{r.rendered}</div>
                  )}
                </div>
              ))}
              {results.length === 0 && (
                <p className="text-gray-400">Execute tools to see results</p>
              )}
            </div>
          </div>
        </div>

        {/* Tool Registry Info */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Registered Tools</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {aui.getTools().map(tool => (
              <div key={tool.name} className="p-3 bg-gray-50 rounded">
                <div className="font-medium">{tool.name}</div>
                <div className="text-xs text-gray-500">
                  {tool.isServerOnly ? 'Server Only' : 'Client + Server'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}