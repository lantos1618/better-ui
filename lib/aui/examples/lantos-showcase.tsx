'use client';

import { aui, z } from '../index';
import { useState } from 'react';

// Ultra-concise tool definitions for AI control

// 1. Simple weather tool - minimal configuration
const weather = aui
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
  ))
  .build();

// 2. Database search with client-side caching
const search = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side database search
    await new Promise(r => setTimeout(r, 500));
    return {
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result for "${input.query}" #${i + 1}`,
        score: Math.random()
      })).sort((a, b) => b.score - a.score)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache?.get(cacheKey);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/aui/search', { 
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    ctx.cache?.set(cacheKey, result, 60000); // Cache for 1 minute
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.results.map(r => (
        <div key={r.id} className="p-2 bg-gray-50 rounded">
          <span className="font-medium">{r.title}</span>
          <span className="ml-2 text-sm text-gray-500">Score: {r.score.toFixed(2)}</span>
        </div>
      ))}
    </div>
  ))
  .build();

// 3. File operations tool - AI can read/write files
const fileOps = aui
  .tool('fileOps')
  .input(z.object({
    operation: z.enum(['read', 'write', 'delete']),
    path: z.string(),
    content: z.string().optional()
  }))
  .execute(async ({ input }) => {
    switch (input.operation) {
      case 'read':
        return { success: true, content: `Contents of ${input.path}`, path: input.path };
      case 'write':
        return { success: true, message: `Wrote to ${input.path}`, path: input.path };
      case 'delete':
        return { success: true, message: `Deleted ${input.path}`, path: input.path };
    }
  })
  .render(({ data }) => (
    <div className="p-3 bg-green-50 rounded">
      {data.success ? '✓' : '✗'} {data.message || data.content}
    </div>
  ))
  .build();

// 4. UI manipulation tool - AI can change the UI
const uiControl = aui
  .tool('uiControl')
  .input(z.object({
    action: z.enum(['show', 'hide', 'update', 'animate']),
    element: z.string(),
    value: z.any().optional()
  }))
  .clientExecute(async ({ input }) => {
    // Direct DOM manipulation by AI
    const element = document.querySelector(input.element);
    if (!element) return { success: false, error: 'Element not found' };
    
    switch (input.action) {
      case 'show':
        (element as HTMLElement).style.display = 'block';
        break;
      case 'hide':
        (element as HTMLElement).style.display = 'none';
        break;
      case 'update':
        element.textContent = String(input.value);
        break;
      case 'animate':
        element.classList.add('animate-pulse');
        setTimeout(() => element.classList.remove('animate-pulse'), 2000);
        break;
    }
    
    return { success: true, action: input.action, element: input.element };
  })
  .render(({ data }) => (
    <div className="p-2 bg-purple-50 rounded">
      UI Action: {data.action} on {data.element}
    </div>
  ))
  .build();

// 5. Backend process control - AI can manage server processes
const processControl = aui
  .tool('process')
  .input(z.object({
    action: z.enum(['start', 'stop', 'restart', 'status']),
    service: z.string()
  }))
  .execute(async ({ input }) => {
    // Simulate process control
    await new Promise(r => setTimeout(r, 1000));
    return {
      service: input.service,
      action: input.action,
      status: input.action === 'status' ? 'running' : `${input.action}ed`,
      pid: Math.floor(Math.random() * 10000),
      uptime: '2h 34m'
    };
  })
  .render(({ data }) => (
    <div className="p-3 bg-yellow-50 rounded">
      <div className="font-medium">{data.service}</div>
      <div className="text-sm text-gray-600">
        Status: {data.status} | PID: {data.pid} | Uptime: {data.uptime}
      </div>
    </div>
  ))
  .build();

// 6. One-liner tool creation using aui.do
aui.do('echo', async (input: { message: string }) => ({ 
  echo: input.message, 
  timestamp: new Date().toISOString() 
}));

// 7. AI-optimized tool with retry and caching
const aiOptimized = aui.ai('smartQuery', {
  input: z.object({ 
    prompt: z.string(),
    model: z.enum(['fast', 'accurate']).default('fast')
  }),
  execute: async (input) => {
    // Simulate AI processing
    await new Promise(r => setTimeout(r, input.model === 'fast' ? 100 : 1000));
    return {
      response: `AI response to: ${input.prompt}`,
      model: input.model,
      confidence: Math.random()
    };
  },
  render: (data) => (
    <div className="p-3 bg-indigo-50 rounded">
      <div>{data.response}</div>
      <div className="text-sm text-gray-500">
        Model: {data.model} | Confidence: {(data.confidence * 100).toFixed(0)}%
      </div>
    </div>
  ),
  retry: 3,
  timeout: 5000,
  cache: true
});

// Export all tools for AI to use
export const tools = {
  weather,
  search,
  fileOps,
  uiControl,
  processControl,
  aiOptimized
};

// Showcase component
export function LantosShowcase() {
  const [results, setResults] = useState<any[]>([]);
  
  const executeToolDemo = async (toolName: string, input: any) => {
    const tool = tools[toolName as keyof typeof tools];
    if (!tool) return;
    
    try {
      const result = await tool.execute({ input, ctx: {} as any });
      setResults(prev => [...prev, { tool: toolName, input, output: result }]);
    } catch (error) {
      console.error('Tool execution error:', error);
    }
  };
  
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">AUI - Assistant UI Control</h1>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Tools</h2>
          <div className="space-y-3">
            <button
              onClick={() => executeToolDemo('weather', { city: 'San Francisco' })}
              className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Get Weather
            </button>
            
            <button
              onClick={() => executeToolDemo('search', { query: 'AI tools', limit: 5 })}
              className="w-full p-3 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Search Database
            </button>
            
            <button
              onClick={() => executeToolDemo('fileOps', { operation: 'read', path: '/config.json' })}
              className="w-full p-3 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              File Operations
            </button>
            
            <button
              onClick={() => executeToolDemo('uiControl', { action: 'animate', element: 'h1' })}
              className="w-full p-3 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Control UI
            </button>
            
            <button
              onClick={() => executeToolDemo('processControl', { action: 'status', service: 'web-server' })}
              className="w-full p-3 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Process Control
            </button>
            
            <button
              onClick={() => executeToolDemo('aiOptimized', { prompt: 'Explain AUI', model: 'accurate' })}
              className="w-full p-3 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              AI Query
            </button>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Execution Results</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded">
                <div className="font-medium">{r.tool}</div>
                <div className="text-sm text-gray-600">
                  Input: {JSON.stringify(r.input)}
                </div>
                <div className="text-sm text-gray-800 mt-1">
                  Output: {JSON.stringify(r.output)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">AI Control Capabilities:</h3>
        <ul className="text-sm space-y-1">
          <li>• Frontend UI manipulation and animation</li>
          <li>• Backend process and service control</li>
          <li>• Database queries with client-side caching</li>
          <li>• File system operations</li>
          <li>• API integrations with retry logic</li>
          <li>• Real-time state synchronization</li>
        </ul>
      </div>
    </div>
  );
}

export default LantosShowcase;