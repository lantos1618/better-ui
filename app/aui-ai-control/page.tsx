'use client';

import { useState, useEffect } from 'react';
import aui, { z } from '@/lib/aui';
import aiControlTools from '@/lib/aui/examples/ai-control-tools';

// Weather tool example
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(Math.random() * 30) + 60,
    city: input.city,
    conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded">
      <h3 className="font-bold">{data.city}</h3>
      <p>{data.temp}°F - {data.conditions}</p>
    </div>
  ));

// Search tool with client-side caching
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    await new Promise(r => setTimeout(r, 500));
    return {
      results: [
        { id: 1, title: `Result for "${input.query}" #1`, score: 0.95 },
        { id: 2, title: `Result for "${input.query}" #2`, score: 0.87 },
        { id: 3, title: `Result for "${input.query}" #3`, score: 0.76 }
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    if (cached) {
      console.log('Cache hit for:', input.query);
      return cached;
    }
    
    const result = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    }).then(r => r.json()).then(res => res.data);
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.results.map((r: any) => (
        <div key={r.id} className="p-3 bg-gray-50 rounded">
          <div className="font-medium">{r.title}</div>
          <div className="text-sm text-gray-500">Score: {r.score}</div>
        </div>
      ))}
    </div>
  ));

export default function AIControlDemo() {
  const [logs, setLogs] = useState<Array<{
    tool: string;
    action: string;
    input: any;
    output: any;
    timestamp: number;
  }>>([]);
  
  const [isAIMode, setIsAIMode] = useState(false);
  
  const ctx = aui.createContext();
  
  const logExecution = (tool: string, action: string, input: any, output: any) => {
    setLogs(prev => [...prev, {
      tool,
      action,
      input,
      output,
      timestamp: Date.now()
    }].slice(-10)); // Keep last 10 logs
  };
  
  // AI-controlled action sequence
  const runAISequence = async () => {
    setIsAIMode(true);
    
    // Simulate AI making decisions and controlling the app
    const sequence = [
      { tool: 'weather', input: { city: 'Tokyo' }, delay: 1000 },
      { tool: 'search', input: { query: 'AI assistants' }, delay: 1500 },
      { tool: 'database', input: { operation: 'find', collection: 'users', query: {} }, delay: 1000 },
      { tool: 'cache', input: { action: 'set', key: 'demo', value: { test: true } }, delay: 800 },
      { tool: 'state', input: { action: 'set', key: 'aiMode', value: true }, delay: 600 },
    ];
    
    for (const step of sequence) {
      await new Promise(r => setTimeout(r, step.delay));
      
      try {
        let result;
        if (step.tool === 'weather') {
          result = await weatherTool.run(step.input, ctx);
        } else if (step.tool === 'search') {
          result = await searchTool.run(step.input, ctx);
        } else if (aiControlTools[step.tool as keyof typeof aiControlTools]) {
          result = await aiControlTools[step.tool as keyof typeof aiControlTools].run(step.input, ctx);
        }
        
        logExecution(step.tool, 'execute', step.input, result);
      } catch (error) {
        logExecution(step.tool, 'error', step.input, { error: String(error) });
      }
    }
    
    setIsAIMode(false);
  };
  
  // Manual tool execution
  const executeTool = async (toolName: string, input: any) => {
    try {
      let result;
      if (toolName === 'weather') {
        result = await weatherTool.run(input, ctx);
      } else if (toolName === 'search') {
        result = await searchTool.run(input, ctx);
      } else if (aiControlTools[toolName as keyof typeof aiControlTools]) {
        result = await aiControlTools[toolName as keyof typeof aiControlTools].run(input, ctx);
      }
      
      logExecution(toolName, 'manual', input, result);
    } catch (error) {
      logExecution(toolName, 'error', input, { error: String(error) });
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AUI - AI Control System</h1>
          <p className="text-gray-600">
            Enable AI to control both frontend and backend operations in Next.js/Vercel
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">AI Control Mode</h2>
              <button
                onClick={runAISequence}
                disabled={isAIMode}
                className={`w-full px-4 py-3 rounded font-medium transition ${
                  isAIMode 
                    ? 'bg-green-500 text-white animate-pulse' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isAIMode ? 'AI is in control...' : 'Start AI Control Sequence'}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                AI will execute a sequence of tool calls automatically
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Manual Controls</h2>
              <div className="space-y-3">
                <button
                  onClick={() => executeTool('weather', { city: 'New York' })}
                  className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Get Weather (New York)
                </button>
                <button
                  onClick={() => executeTool('search', { query: 'Next.js' })}
                  className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Search "Next.js"
                </button>
                <button
                  onClick={() => executeTool('database', { 
                    operation: 'create', 
                    collection: 'logs',
                    data: { message: 'Test entry' }
                  })}
                  className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Create Database Entry
                </button>
                <button
                  onClick={() => executeTool('cache', { 
                    action: 'set',
                    key: 'test-key',
                    value: { cached: true, time: Date.now() }
                  })}
                  className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Set Cache Value
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Available Tools</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  <span>weather - Weather data</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  <span>search - Search with cache</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  <span>database - CRUD operations</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  <span>filesystem - File operations</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  <span>dom - DOM manipulation</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  <span>state - State management</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  <span>navigation - URL control</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  <span>cache - Cache control</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Execution Log */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Execution Log</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No executions yet. Try the AI control sequence or manual controls.
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {log.tool} ({log.action})
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="text-gray-600">
                          Input: {JSON.stringify(log.input, null, 2)}
                        </div>
                        {log.tool === 'weather' && log.output && weatherTool.renderer && (
                          <div className="mt-2">
                            {weatherTool.renderer({ data: log.output })}
                          </div>
                        )}
                        {log.tool === 'search' && log.output && searchTool.renderer && (
                          <div className="mt-2">
                            {searchTool.renderer({ data: log.output })}
                          </div>
                        )}
                        {!['weather', 'search'].includes(log.tool) && (
                          <div className="text-gray-600">
                            Output: {JSON.stringify(log.output, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Code Example */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Implementation Example</h2>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => 
    <div>{data.city}: {data.temp}°</div>
  )

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => 
    db.search(input.query)
  )
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { 
      body: input 
    });
  })
  .render(({ data }) => 
    <SearchResults results={data} />
  )

// AI can now control these tools
await simpleTool.run({ city: 'Tokyo' });
await complexTool.run({ query: 'AI' });`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}