'use client';

import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Simple tool - just 2 methods (exactly as user requested)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization (exactly as user requested)
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulated database search
    const results = await Promise.resolve([
      `Result 1 for ${input.query}`,
      `Result 2 for ${input.query}`,
      `Result 3 for ${input.query}`
    ]);
    return { results, query: input.query };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) {
      console.log('Using cached result for:', input.query);
      return cached;
    }
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json()).catch(() => {
      // Fallback for demo
      return { 
        results: [`Client result for ${input.query}`],
        query: input.query 
      };
    });
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <h3 className="font-semibold">Search Results for "{data.query}"</h3>
      <ul className="list-disc pl-5">
        {data.results.map((result, i) => (
          <li key={i}>{result}</li>
        ))}
      </ul>
    </div>
  ));

// Additional examples showing the power of the API

// Tool with middleware for auth/logging
const protectedTool = aui
  .tool('protected')
  .input(z.object({ action: z.string() }))
  .middleware(async ({ input, ctx, next }) => {
    console.log('Logging action:', input.action);
    if (!ctx.user) {
      throw new Error('Authentication required');
    }
    return next();
  })
  .execute(async ({ input, ctx }) => ({
    result: `Executed ${input.action} for user ${ctx.user?.name || 'unknown'}`
  }))
  .render(({ data }) => <div className="text-green-600">{data.result}</div>);

// Tool with tags and description for AI discovery
const aiReadyTool = aui
  .tool('database')
  .input(z.object({ 
    table: z.string(),
    operation: z.enum(['read', 'write', 'delete'])
  }))
  .describe('Database operations tool for CRUD operations')
  .tag('database', 'crud', 'ai-controlled')
  .execute(async ({ input }) => ({
    success: true,
    operation: input.operation,
    table: input.table,
    result: `${input.operation} operation on ${input.table} completed`
  }))
  .render(({ data }) => (
    <div className={`p-2 rounded ${data.success ? 'bg-green-100' : 'bg-red-100'}`}>
      {data.result}
    </div>
  ));

// Export all tools
export { simpleTool, complexTool, protectedTool, aiReadyTool };

// Demo component showing usage
export function UserAPIDemo() {
  const [results, setResults] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState<Record<string, boolean>>({});

  const runTool = async (toolName: string, tool: any, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    try {
      const result = await tool.run(input, aui.createContext({
        user: { name: 'Demo User' }
      }));
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      console.error(`Error running ${toolName}:`, error);
      setResults(prev => ({ ...prev, [toolName]: { error: error.message } }));
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">AUI User API Demo</h1>
      
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Simple Tool</h2>
          <p className="text-gray-600 mb-3">Just input → execute → render</p>
          <button
            onClick={() => runTool('weather', simpleTool, { city: 'San Francisco' })}
            disabled={loading.weather}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading.weather ? 'Loading...' : 'Get Weather'}
          </button>
          {results.weather && simpleTool.renderer && (
            <div className="mt-3">
              {simpleTool.renderer({ data: results.weather })}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Complex Tool</h2>
          <p className="text-gray-600 mb-3">With client-side caching and optimization</p>
          <button
            onClick={() => runTool('search', complexTool, { query: 'AI tools' })}
            disabled={loading.search}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading.search ? 'Searching...' : 'Search'}
          </button>
          {results.search && complexTool.renderer && (
            <div className="mt-3">
              {complexTool.renderer({ data: results.search })}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Protected Tool</h2>
          <p className="text-gray-600 mb-3">With middleware for auth/logging</p>
          <button
            onClick={() => runTool('protected', protectedTool, { action: 'update-profile' })}
            disabled={loading.protected}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {loading.protected ? 'Executing...' : 'Execute Protected Action'}
          </button>
          {results.protected && protectedTool.renderer && (
            <div className="mt-3">
              {protectedTool.renderer({ data: results.protected })}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">AI-Ready Tool</h2>
          <p className="text-gray-600 mb-3">With tags and description for AI discovery</p>
          <button
            onClick={() => runTool('database', aiReadyTool, { 
              table: 'users', 
              operation: 'read' 
            })}
            disabled={loading.database}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading.database ? 'Processing...' : 'Run Database Operation'}
          </button>
          {results.database && aiReadyTool.renderer && (
            <div className="mt-3">
              {aiReadyTool.renderer({ data: results.database })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-2">Tool Discovery</h3>
        <p className="text-gray-600">
          Tools registered: {aui.getToolNames().join(', ')}
        </p>
      </div>
    </div>
  );
}