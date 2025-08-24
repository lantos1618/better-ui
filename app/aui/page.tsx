'use client';

import { useState } from 'react';
import aui, { z } from '@/lib/aui';

// Ultra-concise tool definitions showing progression from simple to complex

// 1. Simplest possible tool - just execute
const pingTool = aui
  .tool('ping')
  .execute(() => 'pong')
  .build();

// 2. Simple tool with input/output - 2 lines
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// 3. Using shorthand methods for ultra-concise syntax
const calcTool = aui
  .t('calc')
  .i(z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }))
  .e(({ a, b, op }) => {
    const ops = { '+': a + b, '-': a - b, '*': a * b, '/': a / b };
    return ops[op];
  })
  .r(result => <span className="font-mono">{result}</span>)
  .b();

// 4. Complex tool with client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    await new Promise(r => setTimeout(r, 500));
    return { results: [`Result for "${input.query}"`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { body: input });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <ul>{data.results.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
  ))
  .build();

// 5. One-liner tool using .do()
const timestampTool = aui.do('timestamp', () => new Date().toISOString());

// 6. Using .simple() for quick tool creation
const greetTool = aui.simple(
  'greet',
  z.object({ name: z.string() }),
  ({ name }) => `Hello, ${name}!`,
  msg => <h2>{msg}</h2>
);

// 7. AI-optimized tool with retry and caching
const apiTool = aui.ai('apiCall', {
  input: z.object({ endpoint: z.string() }),
  execute: async ({ endpoint }) => {
    // Simulated flaky API
    if (Math.random() > 0.7) throw new Error('API Error');
    return { data: `Response from ${endpoint}` };
  },
  render: ({ data }) => <code>{data.data}</code>,
  retry: 3,
  cache: true
});

// 8. Batch tool definition
const dbTools = aui.defineTools({
  query: {
    input: z.object({ sql: z.string() }),
    execute: async ({ sql }) => ({ rows: [`Query: ${sql}`] }),
    render: ({ rows }) => <pre>{rows.rows.join('\n')}</pre>
  },
  insert: {
    input: z.object({ table: z.string(), data: z.record(z.any()) }),
    execute: async ({ table, data }) => ({ id: Date.now(), table, data }),
    render: ({ id }) => <span>Inserted #{id.id}</span>
  }
});

// 9. Frontend control tool - manipulate UI state
const uiControlTool = aui
  .tool('uiControl')
  .input(z.object({
    action: z.enum(['theme', 'layout', 'modal']),
    value: z.any()
  }))
  .clientExecute(async ({ input, ctx }) => {
    // AI can control UI directly
    switch (input.action) {
      case 'theme':
        document.body.className = input.value;
        return { changed: 'theme', to: input.value };
      case 'layout':
        // Change layout
        return { changed: 'layout', to: input.value };
      case 'modal':
        // Show/hide modal
        return { changed: 'modal', to: input.value };
    }
  })
  .render(({ data }) => <div>UI: {data.changed} → {data.to}</div>)
  .build();

// 10. Backend control tool - execute server operations
const backendTool = aui
  .tool('backend')
  .input(z.object({
    service: z.enum(['database', 'cache', 'queue']),
    operation: z.string(),
    params: z.any()
  }))
  .serverOnly()
  .execute(async ({ input }) => {
    // AI can control backend services
    console.log(`Backend: ${input.service}.${input.operation}`, input.params);
    return { 
      service: input.service,
      operation: input.operation,
      result: 'success'
    };
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      {data.service}.{data.operation}() → {data.result}
    </div>
  ))
  .build();

// Register all tools
const allTools = [
  pingTool, weatherTool, calcTool, searchTool, 
  timestampTool, greetTool, apiTool,
  uiControlTool, backendTool,
  ...Object.values(dbTools)
];

allTools.forEach(tool => aui.register(tool));

export default function AUIPage() {
  const [results, setResults] = useState<any[]>([]);
  const [aiMode, setAiMode] = useState(false);

  const executeTool = async (toolName: string, input: any = {}) => {
    const tool = aui.getTool(toolName);
    if (!tool) return;

    try {
      const result = await tool.execute({ 
        input, 
        ctx: {
          cache: new Map(),
          fetch: async (url: string, opts: any) => {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(opts.body)
            });
            return res.json();
          }
        }
      });

      setResults(prev => [...prev, {
        tool: toolName,
        input,
        output: result,
        rendered: tool.render?.({ data: result, input })
      }]);
    } catch (error: any) {
      setResults(prev => [...prev, {
        tool: toolName,
        error: error.message
      }]);
    }
  };

  // Simulate AI making tool calls
  const aiExecuteSequence = async () => {
    setAiMode(true);
    const sequence = [
      { tool: 'ping', input: {} },
      { tool: 'weather', input: { city: 'Tokyo' } },
      { tool: 'calc', input: { a: 10, b: 20, op: '+' } },
      { tool: 'uiControl', input: { action: 'theme', value: 'dark' } },
      { tool: 'backend', input: { 
        service: 'database', 
        operation: 'query', 
        params: { table: 'users' } 
      }},
      { tool: 'timestamp', input: {} }
    ];

    for (const call of sequence) {
      await executeTool(call.tool, call.input);
      await new Promise(r => setTimeout(r, 500));
    }
    setAiMode(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">AUI - Assistant UI</h1>
        <p className="text-gray-600 mb-8">Ultra-concise API for AI-controlled tools</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tool Examples */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Tool Patterns</h2>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`// Simplest
aui.do('ping', () => 'pong')

// With input
aui.t('add')
  .i(z.object({a: z.number()}))
  .e(({a}) => a + 1)
  .b()

// Full control
aui.tool('search')
  .input(schema)
  .execute(serverFn)
  .clientExecute(clientFn)
  .render(component)
  .build()`}
            </pre>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => executeTool('ping')}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Ping
              </button>
              <button
                onClick={() => executeTool('weather', { city: 'Paris' })}
                className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Weather (Paris)
              </button>
              <button
                onClick={() => executeTool('calc', { a: 5, b: 3, op: '*' })}
                className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Calculate 5 * 3
              </button>
              <button
                onClick={aiExecuteSequence}
                disabled={aiMode}
                className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {aiMode ? 'AI Executing...' : 'AI Control Demo'}
              </button>
            </div>
          </div>

          {/* Registered Tools */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Registered Tools</h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {aui.getTools().map(tool => (
                <div key={tool.name} className="flex justify-between items-center py-1">
                  <span className="font-mono text-sm">{tool.name}</span>
                  <span className="text-xs text-gray-500">
                    {tool.isServerOnly ? 'server' : 'client+server'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Execution Results</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold">{r.tool}</span>
                  {r.error ? (
                    <span className="text-red-500 text-xs">Error</span>
                  ) : (
                    <span className="text-green-500 text-xs">Success</span>
                  )}
                </div>
                {r.error ? (
                  <div className="text-red-600 text-sm">{r.error}</div>
                ) : (
                  <div>{r.rendered || <pre className="text-xs">{JSON.stringify(r.output, null, 2)}</pre>}</div>
                )}
              </div>
            ))}
            {results.length === 0 && (
              <p className="text-gray-400">Execute tools to see results</p>
            )}
          </div>
        </div>

        {/* AI Control Indicator */}
        {aiMode && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full animate-pulse">
            AI in Control
          </div>
        )}
      </div>
    </div>
  );
}