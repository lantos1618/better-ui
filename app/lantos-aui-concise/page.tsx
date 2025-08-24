'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui/lantos-concise';
import { AUIProvider, useAUITool } from '@/lib/aui/lantos-provider';
import { z } from 'zod';

// Define tools exactly as requested
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div className="text-lg">{data.city}: {data.temp}°F</div>);

const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    const response = await fetch('/api/lantos-aui/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) {
      console.log('Using cached result for:', input.query);
      return cached;
    }
    
    const result = await ctx.fetch('/api/lantos-aui/tools/search', {
      method: 'POST',
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <h3 className="font-semibold">Search Results for &quot;{data.query}&quot;:</h3>
      {data.results?.map((result: string, i: number) => (
        <div key={i} className="pl-4 text-gray-700">• {result}</div>
      ))}
    </div>
  ));

// Tool component using the hook
function ToolDemo({ tool, input, title }: { tool: any; input: any; title: string }) {
  const { run } = useAUITool(tool);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const execute = async () => {
    setLoading(true);
    try {
      const data = await run(input);
      setResult(data);
    } catch (error) {
      console.error('Tool execution error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>
      
      <div className="bg-gray-50 p-4 rounded">
        <pre className="text-sm overflow-x-auto">
          <code>{JSON.stringify(input, null, 2)}</code>
        </pre>
      </div>
      
      <button
        onClick={execute}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Running...' : 'Execute'}
      </button>
      
      {result && (
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Result:</h3>
          {tool.render({ data: result })}
        </div>
      )}
    </div>
  );
}

function ShowcaseContent() {
  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Lantos AUI - Concise API</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          A beautifully simple API for defining AI-controlled tools with client/server execution.
          Tools are defined in just 2-4 method calls.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Simple Tool Pattern</h2>
          <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => 
    <div>{data.city}: {data.temp}°</div>
  )`}
            </pre>
          </div>
          <ToolDemo 
            tool={weatherTool} 
            input={{ city: 'San Francisco' }}
            title="Weather Tool"
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Complex Tool with Client Optimization</h2>
          <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => 
    db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || 
      ctx.fetch('/api/tools/search', { 
        body: input 
      });
  })
  .render(({ data }) => 
    <SearchResults results={data} />
  )`}
            </pre>
          </div>
          <ToolDemo 
            tool={searchTool} 
            input={{ query: 'Next.js AUI patterns' }}
            title="Search Tool (with caching)"
          />
        </div>
      </div>

      <div className="border-t pt-8 space-y-4">
        <h2 className="text-2xl font-bold">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold mb-2">🎯 Simple API</h3>
            <p className="text-sm">Define tools in just 2-4 method calls with a fluent interface</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-bold mb-2">⚡ Client Optimization</h3>
            <p className="text-sm">Optional client-side execution with built-in caching</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-bold mb-2">🤖 AI Ready</h3>
            <p className="text-sm">Clear separation between server and client for AI control</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 p-6 rounded-lg">
        <h3 className="font-bold mb-2">Try it yourself!</h3>
        <p className="text-sm text-gray-600 mb-4">
          Click the Execute buttons above to see the tools in action. 
          The search tool will cache results - try executing it twice with the same query!
        </p>
        <div className="text-xs text-gray-500">
          <strong>Note:</strong> Check the console to see caching in action for the search tool.
        </div>
      </div>
    </div>
  );
}

export default function LantosAUIConcisePage() {
  return (
    <AUIProvider>
      <ShowcaseContent />
    </AUIProvider>
  );
}