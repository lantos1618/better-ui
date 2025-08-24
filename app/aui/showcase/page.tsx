'use client';

import { useState, useEffect } from 'react';
import aui, { z } from '@/lib/aui';

// ============================================
// ULTRA-CONCISE AUI SHOWCASE
// ============================================

// 1. ONE-LINER: Simplest possible tool
aui.do('hello', () => 'Hello from AUI!');

// 2. SIMPLE TOOL: Just 2 methods needed
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div className="text-lg">{data.city}: {data.temp}°F</div>)
  .build();

// 3. COMPLEX TOOL: With client-side optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server: Real database search
    await new Promise(r => setTimeout(r, 300));
    return { 
      results: [
        { id: 1, title: `Result for "${input.query}"`, score: 0.95 },
        { id: 2, title: `Another match for "${input.query}"`, score: 0.87 }
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client: Cache for offline/speed
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    const result = await ctx.fetch('/api/tools/search', { body: input });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.results.map((r: any) => (
        <div key={r.id} className="p-2 bg-gray-100 rounded">
          <div className="font-medium">{r.title}</div>
          <div className="text-sm text-gray-600">Score: {r.score}</div>
        </div>
      ))}
    </div>
  ))
  .build();

// 4. AI-OPTIMIZED: Built-in retry and caching
aui.ai('llm-call', {
  input: z.object({ prompt: z.string() }),
  execute: async ({ prompt }) => {
    // Simulate flaky LLM API
    if (Math.random() > 0.6) throw new Error('LLM API Error');
    return { response: `AI says: ${prompt.toUpperCase()}!` };
  },
  render: ({ response }) => <div className="italic">&quot;{response}&quot;</div>,
  retry: 3,
  cache: true
});

// 5. FRONTEND CONTROL: AI can manipulate UI
aui.tool('ui-control')
  .input(z.object({
    element: z.enum(['theme', 'sidebar', 'notification']),
    action: z.string(),
    value: z.any().optional()
  }))
  .clientExecute(async ({ input }) => {
    switch(input.element) {
      case 'theme':
        document.documentElement.setAttribute('data-theme', input.value || 'light');
        return { changed: 'theme', to: input.value };
      case 'sidebar':
        // Toggle sidebar
        return { changed: 'sidebar', to: input.action };
      case 'notification':
        // Show notification
        return { changed: 'notification', message: input.value };
      default:
        return { error: 'Unknown element' };
    }
  })
  .render(({ data }) => (
    <div className="text-sm text-green-600">
      ✓ UI Updated: {data.changed} → {data.to || data.message}
    </div>
  ))
  .build();

// 6. BACKEND CONTROL: AI can execute server operations
aui.tool('backend-ops')
  .input(z.object({
    service: z.enum(['database', 'cache', 'queue', 'email']),
    method: z.string(),
    params: z.record(z.any()).optional()
  }))
  .serverOnly()
  .execute(async ({ input }) => {
    // Simulate backend operations
    const ops: Record<string, () => any> = {
      'database.query': () => ({ rows: 42, time: '12ms' }),
      'cache.flush': () => ({ cleared: true, keys: 156 }),
      'queue.process': () => ({ jobs: 10, status: 'processing' }),
      'email.send': () => ({ sent: true, id: 'msg_123' })
    };
    
    const opKey = `${input.service}.${input.method}`;
    const result = ops[opKey]?.() || { error: 'Unknown operation' };
    
    return { operation: opKey, result };
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      <span className="text-blue-600">{data.operation}</span>
      <span className="text-gray-500"> → </span>
      <span className="text-green-600">{JSON.stringify(data.result)}</span>
    </div>
  ))
  .build();

// 7. ULTRA-SHORT ALIASES: Maximum conciseness
aui.t('add')
  .i(z.object({ a: z.number(), b: z.number() }))
  .e(({ a, b }) => a + b)
  .r(sum => <span className="font-bold">{sum}</span>)
  .b();

// 8. BATCH DEFINITION: Multiple tools at once
aui.defineTools({
  multiply: {
    input: z.object({ x: z.number(), y: z.number() }),
    execute: ({ x, y }) => x * y,
    render: (result) => <span>{result}</span>
  },
  divide: {
    input: z.object({ x: z.number(), y: z.number() }),
    execute: ({ x, y }) => y !== 0 ? x / y : 'Cannot divide by zero',
    render: (result) => <span>{result}</span>
  }
});

// 9. STATEFUL TOOL: With context and state
const statefulTool = aui
  .tool('counter')
  .input(z.object({ action: z.enum(['increment', 'decrement', 'reset']) }))
  .execute(async ({ input, ctx }) => {
    // In real app, this would be database/Redis
    const count = ctx?.count || 0;
    let newCount = count;
    
    switch(input.action) {
      case 'increment': newCount = count + 1; break;
      case 'decrement': newCount = count - 1; break;
      case 'reset': newCount = 0; break;
    }
    
    return { count: newCount, action: input.action };
  })
  .render(({ data }) => (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold">{data.count}</span>
      <span className="text-sm text-gray-500">({data.action})</span>
    </div>
  ))
  .build();

// 10. COMPOSITION: Tools calling other tools
aui.tool('workflow')
  .input(z.object({ steps: z.array(z.string()) }))
  .execute(async ({ input }) => {
    const results = [];
    for (const step of input.steps) {
      const tool = aui.getTool(step);
      if (tool) {
        const result = await tool.execute({ input: {}, ctx: {} });
        results.push({ step, result });
      }
    }
    return { completed: results };
  })
  .render(({ data }) => (
    <div className="space-y-1">
      {data.completed.map((r: any, i: number) => (
        <div key={i} className="text-sm">
          ✓ {r.step}: {JSON.stringify(r.result)}
        </div>
      ))}
    </div>
  ))
  .build();

// Register all tools
aui.register(simpleTool);
aui.register(complexTool);
aui.register(statefulTool);

export default function ShowcasePage() {
  const [results, setResults] = useState<any[]>([]);
  const [aiActive, setAiActive] = useState(false);
  const [theme, setTheme] = useState('light');

  // Tool executor
  const runTool = async (name: string, input: any = {}) => {
    const tool = aui.getTool(name);
    if (!tool) {
      console.error(`Tool ${name} not found`);
      return;
    }

    try {
      const ctx = {
        cache: new Map(),
        fetch: async (url: string, opts: any) => {
          // Simulate API call
          return { results: [{ id: 1, title: 'Mock result' }] };
        },
        count: results.filter(r => r.tool === 'counter').pop()?.output?.count || 0
      };

      const output = await tool.execute({ input, ctx });
      const rendered = tool.render?.({ data: output, input });

      setResults(prev => [...prev, {
        tool: name,
        input,
        output,
        rendered,
        timestamp: new Date().toISOString()
      }].slice(-10)); // Keep last 10 results
    } catch (error: any) {
      setResults(prev => [...prev, {
        tool: name,
        input,
        error: error.message,
        timestamp: new Date().toISOString()
      }].slice(-10));
    }
  };

  // AI Control Simulation
  const aiControlDemo = async () => {
    setAiActive(true);
    
    const sequence = [
      { tool: 'hello', input: {} },
      { tool: 'weather', input: { city: 'San Francisco' } },
      { tool: 'search', input: { query: 'AUI framework' } },
      { tool: 'ui-control', input: { element: 'theme', action: 'set', value: 'dark' } },
      { tool: 'backend-ops', input: { service: 'database', method: 'query' } },
      { tool: 'counter', input: { action: 'increment' } },
      { tool: 'counter', input: { action: 'increment' } },
      { tool: 'add', input: { a: 10, b: 32 } },
      { tool: 'llm-call', input: { prompt: 'Hello AI' } },
      { tool: 'workflow', input: { steps: ['hello', 'add'] } }
    ];

    for (const call of sequence) {
      await runTool(call.tool, call.input);
      await new Promise(r => setTimeout(r, 600));
    }
    
    setAiActive(false);
  };

  useEffect(() => {
    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      setTheme(currentTheme || 'light');
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50'} transition-colors`}>
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AUI Showcase
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Ultra-concise API for AI to control your Next.js app
          </p>
        </div>

        {/* Code Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h2 className="text-2xl font-bold mb-4">Simple Tool (2 methods)</h2>
            <pre className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} p-4 rounded-lg overflow-x-auto text-sm`}>
              <code>{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => 
    <div>{data.city}: {data.temp}°</div>
  )
  .build();`}</code>
            </pre>
          </div>

          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h2 className="text-2xl font-bold mb-4">Complex Tool (adds client)</h2>
            <pre className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} p-4 rounded-lg overflow-x-auto text-sm`}>
              <code>{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(serverHandler)
  .clientExecute(async ({ input, ctx }) => {
    // Cache, offline, optimistic updates
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api', input);
  })
  .render(SearchResults)
  .build();`}</code>
            </pre>
          </div>
        </div>

        {/* Interactive Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Manual Controls */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h3 className="text-lg font-bold mb-4">Manual Controls</h3>
            <div className="space-y-2">
              <button
                onClick={() => runTool('hello')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Hello Tool
              </button>
              <button
                onClick={() => runTool('weather', { city: 'Tokyo' })}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Weather (Tokyo)
              </button>
              <button
                onClick={() => runTool('counter', { action: 'increment' })}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Counter++
              </button>
              <button
                onClick={() => runTool('ui-control', { 
                  element: 'theme', 
                  action: 'set', 
                  value: theme === 'dark' ? 'light' : 'dark' 
                })}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
              >
                Toggle Theme
              </button>
            </div>
          </div>

          {/* AI Control */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h3 className="text-lg font-bold mb-4">AI Control</h3>
            <button
              onClick={aiControlDemo}
              disabled={aiActive}
              className={`w-full px-4 py-3 rounded-lg transition font-medium ${
                aiActive 
                  ? 'bg-red-600 text-white animate-pulse cursor-not-allowed' 
                  : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700'
              }`}
            >
              {aiActive ? '🤖 AI in Control...' : '🚀 Run AI Sequence'}
            </button>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>AI will execute:</p>
              <ul className="mt-2 space-y-1">
                <li>• Call multiple tools</li>
                <li>• Control UI theme</li>
                <li>• Execute backend ops</li>
                <li>• Manage state</li>
              </ul>
            </div>
          </div>

          {/* Available Tools */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h3 className="text-lg font-bold mb-4">Available Tools ({aui.getTools().length})</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {aui.getTools().map(tool => (
                <div key={tool.name} className="flex justify-between items-center py-1">
                  <span className="font-mono text-sm">{tool.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    tool.isServerOnly 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  }`}>
                    {tool.isServerOnly ? 'server' : 'hybrid'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <h3 className="text-lg font-bold mb-4">Execution Log</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Execute tools to see results here
              </p>
            ) : (
              results.map((r, i) => (
                <div 
                  key={i} 
                  className={`border-l-4 ${
                    r.error ? 'border-red-500' : 'border-green-500'
                  } pl-4 py-2`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold">{r.tool}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </span>
                    {r.error && <span className="text-xs text-red-500">ERROR</span>}
                  </div>
                  {r.input && Object.keys(r.input).length > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Input: {JSON.stringify(r.input)}
                    </div>
                  )}
                  <div>
                    {r.error ? (
                      <div className="text-red-600 text-sm">{r.error}</div>
                    ) : r.rendered ? (
                      r.rendered
                    ) : (
                      <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded">
                        {JSON.stringify(r.output, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Status Indicator */}
        {aiActive && (
          <div className="fixed bottom-8 right-8 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl animate-pulse flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
            AI in Control
          </div>
        )}
      </div>
    </div>
  );
}