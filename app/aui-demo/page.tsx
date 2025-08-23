'use client';

import { useState } from 'react';
import { ToolExecutorProvider, ToolRenderer } from '@/lib/aui/client';
import tools, { weatherSimple, searchComplex } from '@/lib/aui/tools';
import type { ToolCall } from '@/lib/aui/types';

export default function AUIDemo() {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [weatherCity, setWeatherCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('artificial intelligence');
  const [activeTab, setActiveTab] = useState<'simple' | 'complex'>('simple');

  const executeWeatherTool = () => {
    const toolCall: ToolCall = {
      id: crypto.randomUUID(),
      toolName: 'weather',
      input: { city: weatherCity },
    };
    setToolCalls(prev => [...prev, toolCall]);
  };

  const executeSearchTool = () => {
    const toolCall: ToolCall = {
      id: crypto.randomUUID(),
      toolName: 'search',
      input: { query: searchQuery, limit: 5 },
    };
    setToolCalls(prev => [...prev, toolCall]);
  };

  const allTools = {
    ...tools,
    weatherSimple,
    searchComplex,
  };

  return (
    <ToolExecutorProvider tools={Object.values(allTools)}>
      <div className="container mx-auto p-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">AUI Tool System Demo</h1>
        <p className="text-gray-600 mb-8">Assistant-UI for tool calls with client and server execution</p>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('simple')}
            className={`px-4 py-2 rounded ${activeTab === 'simple' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Simple Tools
          </button>
          <button
            onClick={() => setActiveTab('complex')}
            className={`px-4 py-2 rounded ${activeTab === 'complex' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Complex Tools
          </button>
        </div>
        
        {activeTab === 'simple' ? (
          <div className="mb-8">
            <div className="bg-gray-50 rounded-lg p-6 mb-4">
              <h3 className="font-mono text-sm mb-2">Simple Tool Pattern:</h3>
              <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();`}
              </pre>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Weather (Simple)</h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={weatherCity}
                    onChange={(e) => setWeatherCity(e.target.value)}
                    placeholder="Enter city name"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <button
                    onClick={() => {
                      const toolCall: ToolCall = {
                        id: crypto.randomUUID(),
                        toolName: 'weatherSimple',
                        input: { city: weatherCity },
                      };
                      setToolCalls(prev => [...prev, toolCall]);
                    }}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Get Weather
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-gray-50 rounded-lg p-6 mb-4">
              <h3 className="font-mono text-sm mb-2">Complex Tool Pattern:</h3>
              <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();`}
              </pre>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Search (Complex)</h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter search query"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <button
                    onClick={() => {
                      const toolCall: ToolCall = {
                        id: crypto.randomUUID(),
                        toolName: 'searchComplex',
                        input: { query: searchQuery },
                      };
                      setToolCalls(prev => [...prev, toolCall]);
                    }}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Tool Results</h2>
          {toolCalls.length === 0 ? (
            <p className="text-gray-500">No tools executed yet. Try using the tools above!</p>
          ) : (
            toolCalls.map((toolCall) => (
              <div key={toolCall.id} className="border rounded-lg p-4">
                <div className="mb-2 text-sm text-gray-600">
                  Tool: <span className="font-mono">{toolCall.toolName}</span>
                </div>
                <ToolRenderer
                  toolCall={toolCall}
                  tool={allTools[toolCall.toolName as keyof typeof allTools]}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </ToolExecutorProvider>
  );
}