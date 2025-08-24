import React from 'react';
import aui, { z } from './index';

// ============================================================================
// AUI (Assistant-UI) - Ultra-Concise Tool API for AI Control
// ============================================================================
// This showcase demonstrates how AI can control both frontend and backend
// using a minimal, elegant API that's optimized for tool calls
// ============================================================================

// -----------------------------------------------------------------------------
// 1. SIMPLE TOOL - Just 2 methods (execute + render)
// -----------------------------------------------------------------------------
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Server-side execution
    const response = await fetch(`https://api.weather.com/v1/${input.city}`);
    return { temp: 72, city: input.city, conditions: 'sunny' };
  })
  .render(({ data }) => (
    <div className="weather-card">
      <h3>{data.city}</h3>
      <p>{data.temp}°F - {data.conditions}</p>
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// 2. COMPLEX TOOL - Adds client-side optimization
// -----------------------------------------------------------------------------
const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    filters: z.object({
      category: z.enum(['all', 'docs', 'code', 'issues']).optional(),
      dateRange: z.enum(['day', 'week', 'month', 'year']).optional()
    }).optional()
  }))
  .execute(async ({ input }) => {
    // Server-side: Direct database access
    console.log('Server search:', input.query);
    return {
      results: [
        { id: 1, title: `Result for "${input.query}"`, score: 0.95 },
        { id: 2, title: `Another match for "${input.query}"`, score: 0.87 }
      ],
      totalCount: 2,
      executedAt: 'server'
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: Optimized with caching
    const cacheKey = `search:${input.query}:${JSON.stringify(input.filters)}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return { ...cached.data, executedAt: 'cache' };
    }
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    ctx.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return { ...result, executedAt: 'client' };
  })
  .render(({ data }) => (
    <div className="search-results">
      <div className="meta">
        {data.totalCount} results (from {data.executedAt})
      </div>
      {data.results.map(item => (
        <div key={item.id} className="result">
          <h4>{item.title}</h4>
          <span className="score">Score: {item.score}</span>
        </div>
      ))}
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// 3. AI CONTROL TOOLS - Backend operations controllable by AI
// -----------------------------------------------------------------------------
const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['query', 'insert', 'update', 'delete']),
    table: z.string(),
    data: z.record(z.any()).optional(),
    where: z.record(z.any()).optional(),
    limit: z.number().optional()
  }))
  .serverOnly() // Never expose to client
  .execute(async ({ input }) => {
    // This runs ONLY on the server - AI can control database
    switch (input.operation) {
      case 'query':
        return { 
          rows: [{ id: 1, name: 'Example' }],
          count: 1 
        };
      case 'insert':
        return { 
          inserted: true, 
          id: Math.random().toString(36) 
        };
      case 'update':
        return { 
          updated: true, 
          affectedRows: 1 
        };
      case 'delete':
        return { 
          deleted: true, 
          affectedRows: 1 
        };
    }
  })
  .render(({ data }) => (
    <div className="db-result">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// 4. UI MANIPULATION TOOL - AI controls the frontend
// -----------------------------------------------------------------------------
const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'update', 'animate']),
    target: z.string(), // CSS selector or component ID
    properties: z.record(z.any()).optional(),
    duration: z.number().optional()
  }))
  .clientExecute(async ({ input }) => {
    // Runs on client - AI directly manipulates DOM/React state
    const element = document.querySelector(input.target);
    
    switch (input.action) {
      case 'show':
        if (element) element.style.display = 'block';
        break;
      case 'hide':
        if (element) element.style.display = 'none';
        break;
      case 'update':
        if (element && input.properties) {
          Object.assign(element.style, input.properties);
        }
        break;
      case 'animate':
        if (element) {
          element.animate(
            [input.properties || {}],
            { duration: input.duration || 300, fill: 'forwards' }
          );
        }
        break;
    }
    
    return { 
      success: true, 
      action: input.action,
      target: input.target 
    };
  })
  .render(({ data }) => (
    <div className="ui-control-result">
      ✓ {data.action} on {data.target}
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// 5. FILE SYSTEM TOOL - AI controls file operations
// -----------------------------------------------------------------------------
const fileSystemTool = aui
  .tool('filesystem')
  .input(z.object({
    operation: z.enum(['read', 'write', 'delete', 'list']),
    path: z.string(),
    content: z.string().optional(),
    encoding: z.enum(['utf8', 'base64']).default('utf8')
  }))
  .serverOnly()
  .execute(async ({ input }) => {
    // Server-only file operations
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Sandbox to safe directory
    const safePath = path.join(process.cwd(), 'sandbox', input.path);
    
    switch (input.operation) {
      case 'read':
        const content = await fs.readFile(safePath, input.encoding);
        return { content, path: input.path };
        
      case 'write':
        await fs.writeFile(safePath, input.content || '', input.encoding);
        return { written: true, path: input.path };
        
      case 'delete':
        await fs.unlink(safePath);
        return { deleted: true, path: input.path };
        
      case 'list':
        const files = await fs.readdir(path.dirname(safePath));
        return { files, path: input.path };
    }
  })
  .render(({ data }) => (
    <div className="file-result">
      {data.content ? (
        <pre>{data.content}</pre>
      ) : (
        <div>{JSON.stringify(data, null, 2)}</div>
      )}
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// 6. PROCESS EXECUTION TOOL - AI can run commands
// -----------------------------------------------------------------------------
const processTool = aui
  .tool('process')
  .input(z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    cwd: z.string().optional(),
    timeout: z.number().default(5000)
  }))
  .serverOnly()
  .execute(async ({ input }) => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Whitelist safe commands
    const safeCommands = ['ls', 'echo', 'date', 'pwd', 'whoami'];
    if (!safeCommands.includes(input.command.split(' ')[0])) {
      throw new Error(`Command not allowed: ${input.command}`);
    }
    
    const { stdout, stderr } = await execAsync(input.command, {
      cwd: input.cwd,
      timeout: input.timeout
    });
    
    return { stdout, stderr, command: input.command };
  })
  .render(({ data }) => (
    <div className="process-result">
      <div className="command">$ {data.command}</div>
      {data.stdout && <pre className="stdout">{data.stdout}</pre>}
      {data.stderr && <pre className="stderr">{data.stderr}</pre>}
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// 7. STATE MANAGEMENT TOOL - AI controls application state
// -----------------------------------------------------------------------------
const stateTool = aui
  .tool('state')
  .input(z.object({
    action: z.enum(['get', 'set', 'update', 'delete']),
    key: z.string(),
    value: z.any().optional(),
    merge: z.boolean().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Access global state store
    const store = ctx.store || window.__APP_STORE__;
    
    switch (input.action) {
      case 'get':
        return { value: store.get(input.key) };
        
      case 'set':
        store.set(input.key, input.value);
        return { set: true, key: input.key };
        
      case 'update':
        const current = store.get(input.key);
        const updated = input.merge 
          ? { ...current, ...input.value }
          : input.value;
        store.set(input.key, updated);
        return { updated: true, key: input.key, value: updated };
        
      case 'delete':
        store.delete(input.key);
        return { deleted: true, key: input.key };
    }
  })
  .render(({ data }) => (
    <div className="state-result">
      <code>{JSON.stringify(data, null, 2)}</code>
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// 8. HTTP REQUEST TOOL - AI makes API calls
// -----------------------------------------------------------------------------
const httpTool = aui
  .tool('http')
  .input(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    timeout: z.number().default(30000)
  }))
  .execute(async ({ input }) => {
    const response = await fetch(input.url, {
      method: input.method,
      headers: {
        'Content-Type': 'application/json',
        ...input.headers
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
      signal: AbortSignal.timeout(input.timeout)
    });
    
    const data = await response.json();
    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  })
  .render(({ data }) => (
    <div className="http-result">
      <div className="status">
        {data.status} {data.statusText}
      </div>
      <pre>{JSON.stringify(data.data, null, 2)}</pre>
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// 9. REAL-TIME TOOL - WebSocket/SSE for live updates
// -----------------------------------------------------------------------------
const realtimeTool = aui
  .tool('realtime')
  .input(z.object({
    channel: z.string(),
    action: z.enum(['subscribe', 'unsubscribe', 'send']),
    message: z.any().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    const ws = ctx.websocket || new WebSocket(`wss://api.example.com/${input.channel}`);
    
    switch (input.action) {
      case 'subscribe':
        return new Promise((resolve) => {
          ws.onmessage = (event) => {
            resolve({ 
              subscribed: true, 
              channel: input.channel,
              message: JSON.parse(event.data)
            });
          };
        });
        
      case 'send':
        ws.send(JSON.stringify(input.message));
        return { sent: true, channel: input.channel };
        
      case 'unsubscribe':
        ws.close();
        return { unsubscribed: true, channel: input.channel };
    }
  })
  .render(({ data }) => (
    <div className="realtime-result">
      <div className="channel">{data.channel}</div>
      {data.message && <pre>{JSON.stringify(data.message, null, 2)}</pre>}
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// 10. ULTRA-CONCISE SYNTAX EXAMPLES
// -----------------------------------------------------------------------------

// One-liner tool creation
const simpleTool = aui
  .t('simple')
  .do(async (input: { text: string }) => input.text.toUpperCase());

// With rendering
const withRenderTool = aui
  .t('render')
  .do({
    input: z.object({ text: z.string() }),
    execute: async (input) => ({ result: input.text.toUpperCase() }),
    render: (data) => <div>{data.result}</div>
  });

// AI-optimized with retries and caching
const aiOptimizedTool = aui.ai('ai-tool', {
  input: z.object({ prompt: z.string() }),
  execute: async (input) => {
    // AI operations with automatic retry
    return { response: `AI: ${input.prompt}` };
  },
  client: async (input, ctx) => {
    // Client-side caching
    return ctx.cache.getOrFetch(input.prompt, async () => {
      return ctx.fetch('/api/ai', { body: input });
    });
  },
  render: (data) => <div>{data.response}</div>,
  retry: 3,
  timeout: 10000,
  cache: true
});

// -----------------------------------------------------------------------------
// REGISTER ALL TOOLS
// -----------------------------------------------------------------------------
[
  weatherTool,
  searchTool,
  databaseTool,
  uiControlTool,
  fileSystemTool,
  processTool,
  stateTool,
  httpTool,
  realtimeTool,
  simpleTool,
  withRenderTool,
  aiOptimizedTool
].forEach(tool => aui.register(tool));

// -----------------------------------------------------------------------------
// EXPORT FOR AI CONSUMPTION
// -----------------------------------------------------------------------------
export const allTools = aui.getTools();
export { 
  weatherTool,
  searchTool,
  databaseTool,
  uiControlTool,
  fileSystemTool,
  processTool,
  stateTool,
  httpTool,
  realtimeTool,
  simpleTool,
  withRenderTool,
  aiOptimizedTool
};

// -----------------------------------------------------------------------------
// USAGE IN COMPONENTS
// -----------------------------------------------------------------------------
export function AIControlPanel() {
  return (
    <div className="ai-control-panel">
      <h2>AI Control Panel - Available Tools</h2>
      <div className="tools-grid">
        {allTools.map(tool => (
          <div key={tool.name} className="tool-card">
            <h3>{tool.name}</h3>
            <p>{tool.description || 'AI-controllable tool'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AIControlPanel;