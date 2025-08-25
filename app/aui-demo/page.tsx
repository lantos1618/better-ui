'use client';

import { useState, useEffect } from 'react';
import aui, { 
  z, 
  useAUITool, 
  clientExecutor, 
  executeClientTool,
  assistants,
  globalToolRegistry,
  aiControlSystem
} from '@/lib/aui';

// Define some example tools
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { temp: Math.floor(Math.random() * 30) + 10, city: input.city };
  })
  .render(({ data }) => (
    <div className="p-4 bg-blue-100 rounded">
      <h3 className="font-bold">{data.city}</h3>
      <p className="text-2xl">{data.temp}°C</p>
    </div>
  ));

const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      results: [
        { id: 1, title: `Result for "${input.query}" 1`, score: 0.95 },
        { id: 2, title: `Result for "${input.query}" 2`, score: 0.87 },
        { id: 3, title: `Result for "${input.query}" 3`, score: 0.76 },
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) {
      console.log('Returning cached results for:', input.query);
      return cached;
    }
    
    // Fetch from server
    const response = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    });
    
    const result = await response.json();
    const data = result.data || result;
    
    // Store in cache
    ctx.cache.set(cacheKey, data);
    return data;
  })
  .render(({ data }) => (
    <div className="p-4 bg-green-100 rounded">
      <h3 className="font-bold mb-2">Search Results</h3>
      {data.results.map((r: any) => (
        <div key={r.id} className="py-1">
          <span className="font-medium">{r.title}</span>
          <span className="text-sm text-gray-600 ml-2">(score: {r.score})</span>
        </div>
      ))}
    </div>
  ));

export default function AUIDemo() {
  const [city, setCity] = useState('London');
  const [query, setQuery] = useState('Next.js');
  const [toolList, setToolList] = useState<any[]>([]);
  const [aiResponse, setAiResponse] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  const weatherResult = useAUITool(weatherTool, { city } as any);
  const searchResult = useAUITool(searchTool, { query } as any);

  useEffect(() => {
    // List all available tools
    const auiTools = aui.list();
    const aiTools = aiControlSystem.listTools();
    const registryTools = globalToolRegistry.list();
    
    setToolList([
      ...auiTools.map(t => ({ ...t.toJSON(), source: 'AUI' })),
      ...aiTools.map(t => ({ ...t, source: 'AI Control' })),
      ...registryTools.map(t => ({ ...t, source: 'Registry' }))
    ]);
    
    // Get cache stats
    setCacheStats(clientExecutor.getCacheStats());
  }, []);

  const handleAIAssistant = async () => {
    const assistant = assistants.webDeveloper;
    const result = await assistant.processMessage(aiInput);
    setAiResponse(result.response);
    
    if (result.toolCalls) {
      setExecutionLogs(prev => [...prev, ...result.toolCalls!]);
    }
  };

  const handleOptimisticExecution = async () => {
    const result = await executeClientTool('weather', { city: 'Tokyo' }, {
      optimistic: () => ({ temp: 20, city: 'Tokyo (optimistic)' }),
      onSuccess: (result) => {
        console.log('Real result:', result);
        setExecutionLogs(prev => [...prev, {
          tool: 'weather',
          input: { city: 'Tokyo' },
          result,
          timestamp: new Date()
        }]);
      },
      onError: (error) => {
        console.error('Execution failed:', error);
      }
    });
    
    console.log('Optimistic result returned immediately:', result);
  };

  const handleClearCache = () => {
    clientExecutor.clearCache();
    setCacheStats(clientExecutor.getCacheStats());
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">AUI System Demo</h1>
      
      {/* Simple Tool Execution */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Simple Tool Execution</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2">Weather City:</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2 border rounded"
            />
            {weatherResult.loading && <p className="mt-2">Loading weather...</p>}
            {weatherResult.error && <p className="mt-2 text-red-500">Error: {weatherResult.error.message}</p>}
            {weatherResult.data && weatherTool.renderer && weatherTool.renderer({ data: weatherResult.data })}
          </div>
          
          <div>
            <label className="block mb-2">Search Query:</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-2 border rounded"
            />
            {searchResult.loading && <p className="mt-2">Searching...</p>}
            {searchResult.error && <p className="mt-2 text-red-500">Error: {searchResult.error.message}</p>}
            {searchResult.data && searchTool.renderer && searchTool.renderer({ data: searchResult.data })}
          </div>
        </div>
      </section>

      {/* AI Assistant */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">AI Assistant Integration</h2>
        
        <div className="mb-4">
          <label className="block mb-2">Ask the assistant (use @toolname{"input"} to call tools):</label>
          <textarea
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder='Example: @weather{"city":"Paris"} to get weather'
          />
          <button
            onClick={handleAIAssistant}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Send to Assistant
          </button>
        </div>
        
        {aiResponse && (
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">Assistant Response:</h3>
            <pre className="whitespace-pre-wrap">{aiResponse}</pre>
          </div>
        )}
      </section>

      {/* Advanced Features */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Advanced Features</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold mb-2">Optimistic Updates</h3>
            <button
              onClick={handleOptimisticExecution}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Execute with Optimistic Update
            </button>
          </div>
          
          <div>
            <h3 className="font-bold mb-2">Cache Management</h3>
            <div className="mb-2">
              {cacheStats && (
                <p>Cache: {cacheStats.size} items ({cacheStats.storage})</p>
              )}
            </div>
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </section>

      {/* Tool Registry */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Tools</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Name</th>
                <th className="border p-2 text-left">Source</th>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-left">Tags</th>
              </tr>
            </thead>
            <tbody>
              {toolList.slice(0, 10).map((tool, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{tool.name}</td>
                  <td className="border p-2">{tool.source}</td>
                  <td className="border p-2">{tool.description || 'N/A'}</td>
                  <td className="border p-2">
                    {tool.tags?.join(', ') || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Execution Logs */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Execution Logs</h2>
        
        <div className="max-h-64 overflow-y-auto border rounded p-4 bg-gray-50">
          {executionLogs.length === 0 ? (
            <p className="text-gray-500">No executions yet</p>
          ) : (
            executionLogs.map((log, idx) => (
              <div key={idx} className="mb-2 p-2 bg-white rounded border">
                <div className="font-mono text-sm">
                  <span className="font-bold">{log.tool || log.id}</span>
                  {log.status && <span className="ml-2 text-gray-600">({log.status})</span>}
                </div>
                <div className="text-sm text-gray-600">
                  Input: {JSON.stringify(log.input)}
                </div>
                {log.result && (
                  <div className="text-sm text-green-600">
                    Result: {JSON.stringify(log.result)}
                  </div>
                )}
                {log.error && (
                  <div className="text-sm text-red-600">
                    Error: {log.error.message}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}