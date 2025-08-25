'use client';

import { useState } from 'react';
import aui, { 
  clientTools,
  globalToolRegistry,
  toolDiscovery 
} from '@/lib/aui';
import { z } from 'zod';
import { useAUITool } from '@/lib/aui/hooks/useAUITool';
import { AUIProvider } from '@/lib/aui/provider';

// Simple tool - just 2 methods (EXACTLY as requested)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization (EXACTLY as requested)
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // In real app: db.search(input.query)
    return [
      { id: 1, title: `Result for ${input.query}`, score: 0.95 },
      { id: 2, title: `Another match for ${input.query}`, score: 0.87 }
    ];
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

// SearchResults component for the complex tool
function SearchResults({ results }: { results: any[] }) {
  return (
    <div className="space-y-2">
      {results.map((item) => (
        <div key={item.id} className="p-2 border rounded">
          <div className="font-medium">{item.title}</div>
          {item.score && <div className="text-sm text-gray-500">Score: {item.score}</div>}
        </div>
      ))}
    </div>
  );
}

function SimpleToolDemo() {
  const { execute, data, loading, error } = useAUITool(simpleTool);
  const [city, setCity] = useState('New York');
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Simple Tool - Just 2 Methods</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city"
          className="px-3 py-2 border rounded"
        />
        <button
          onClick={() => execute({ city })}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Weather'}
        </button>
      </div>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {data && simpleTool.renderer && simpleTool.renderer({ data })}
    </div>
  );
}

function ComplexToolDemo() {
  const { execute, data, loading, error } = useAUITool(complexTool);
  const [query, setQuery] = useState('typescript');
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Complex Tool - With Client Optimization</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query"
          className="px-3 py-2 border rounded"
        />
        <button
          onClick={() => execute({ query })}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      <p className="text-sm text-gray-500">
        Try searching multiple times - subsequent searches will use cached results!
      </p>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {data && complexTool.renderer && complexTool.renderer({ data })}
    </div>
  );
}

function AIControlDemo() {
  const [aiResults, setAIResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runAIControl = async (action: string) => {
    setLoading(true);
    try {
      let result;
      
      switch (action) {
        case 'dom':
          result = await clientTools.domManipulation.run({
            operation: 'create',
            element: 'div',
            content: 'AI-controlled element created!',
            selector: '#ai-container',
            styles: { 
              padding: '1rem', 
              backgroundColor: '#e0f2fe',
              borderRadius: '8px',
              marginTop: '0.5rem'
            }
          });
          break;
        
        case 'storage':
          result = await clientTools.storageControl.run({
            type: 'local',
            operation: 'set',
            key: 'aui-ai-demo',
            value: { 
              timestamp: new Date().toISOString(), 
              controlled: true,
              message: 'AI has control'
            }
          });
          break;
        
        case 'discovery':
          const tools = await toolDiscovery.discoverTools();
          result = { 
            discovered: tools.length, 
            categories: globalToolRegistry.listByCategory(),
            stats: globalToolRegistry.getStats()
          };
          break;
        
        default:
          result = { error: 'Unknown action' };
      }
      
      setAIResults(prev => [{ action, result, time: new Date().toISOString() }, ...prev.slice(0, 2)]);
    } catch (error) {
      setAIResults(prev => [{ action, error: error instanceof Error ? error.message : 'Unknown error', time: new Date().toISOString() }, ...prev.slice(0, 2)]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">AI Control Tools</h2>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => runAIControl('dom')}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Control DOM
        </button>
        <button
          onClick={() => runAIControl('storage')}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          Control Storage
        </button>
        <button
          onClick={() => runAIControl('discovery')}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          Discover Tools
        </button>
      </div>
      <div id="ai-container"></div>
      {aiResults.length > 0 && (
        <div className="space-y-2">
          {aiResults.map((r, i) => (
            <div key={i} className="p-3 bg-gray-100 rounded text-sm">
              <div className="font-medium">{r.action}</div>
              <pre className="text-xs overflow-auto">{JSON.stringify(r.result || r.error, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AUIDemo() {
  return (
    <AUIProvider>
      <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">AUI (Assistant-UI) Tool System Demo</h1>
      
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Your Exact API Request ✅</h2>
        <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto text-sm">
{`// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input) 
    }).then(r => r.json());
  })
  .render(({ data }) => <SearchResults results={data} />)`}
        </pre>
      </div>
      
      <div className="space-y-8">
        <SimpleToolDemo />
        <ComplexToolDemo />
        <AIControlDemo />
      </div>
      
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Features</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>✅ Concise API - no .build() methods needed</li>
          <li>✅ Server and client execution for AI control</li>
          <li>✅ Type-safe with Zod validation</li>
          <li>✅ React integration with hooks</li>
          <li>✅ Context with caching support</li>
          <li>✅ Ready for AI to control frontend and backend</li>
        </ul>
      </div>
    </div>
    </AUIProvider>
  );
}