import aui, { z } from './index';
import React from 'react';

// Simple weather tool - just 2 methods
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex search tool - adds client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: search database
    const results = await simulateDbSearch(input.query);
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first, then fetch
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const response = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    });
    
    const data = await response.json();
    ctx.cache.set(input.query, data);
    return data;
  })
  .render(({ data }) => <SearchResults results={data} />);

// Calculator tool with simple operation syntax
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({ 
    a: z.number(), 
    b: z.number(), 
    op: z.enum(['+', '-', '*', '/']) 
  }))
  .execute(async ({ input }) => {
    const { a, b, op } = input;
    const operations = {
      '+': a + b,
      '-': a - b,
      '*': a * b,
      '/': b !== 0 ? a / b : NaN
    };
    return { result: operations[op], a, b, op };
  })
  .render(({ data }) => (
    <div className="p-4 bg-gray-50 rounded">
      <span className="font-mono">
        {data.a} {data.op === '*' ? '×' : data.op === '/' ? '÷' : data.op} {data.b} = {data.result}
      </span>
    </div>
  ));

// Database tool for data operations
export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['query', 'insert', 'update', 'delete']),
    table: z.string(),
    select: z.array(z.string()).optional(),
    where: z.record(z.any()).optional(),
    data: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Simulate database operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (input.operation === 'query') {
      return {
        rows: [
          { id: 1, name: 'Alice', status: 'active' },
          { id: 2, name: 'Bob', status: 'active' },
          { id: 3, name: 'Charlie', status: 'inactive' }
        ],
        count: 3
      };
    }
    
    return { success: true, operation: input.operation };
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.rows ? (
        <div>
          <div className="text-sm text-gray-600 mb-2">Found {data.count} records</div>
          {data.rows.map((row: any, i: number) => (
            <div key={i} className="p-2 bg-gray-50 rounded text-sm">
              {JSON.stringify(row)}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-green-600">Operation {data.operation} completed</div>
      )}
    </div>
  ));

// File system tool
export const fileSystemTool = aui
  .tool('filesystem')
  .input(z.object({
    operation: z.enum(['read', 'write', 'list', 'delete']),
    path: z.string(),
    content: z.string().optional()
  }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (input.operation === 'list') {
      return {
        files: ['app.tsx', 'layout.tsx', 'page.tsx'],
        directories: ['components', 'lib', 'styles']
      };
    }
    
    return { success: true, path: input.path };
  })
  .render(({ data }) => (
    <div className="text-sm">
      {data.files ? (
        <div>
          <div className="font-semibold mb-1">Files:</div>
          {data.files.map((file: string) => (
            <div key={file} className="pl-2">📄 {file}</div>
          ))}
          <div className="font-semibold mt-2 mb-1">Directories:</div>
          {data.directories.map((dir: string) => (
            <div key={dir} className="pl-2">📁 {dir}</div>
          ))}
        </div>
      ) : (
        <div>✅ {data.path}</div>
      )}
    </div>
  ));

// API tool for HTTP requests
export const apiTool = aui
  .tool('api')
  .input(z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    headers: z.record(z.string()).optional(),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (input.url.includes('github.com')) {
      return {
        name: 'next.js',
        stars: 120000,
        language: 'TypeScript',
        description: 'The React Framework'
      };
    }
    
    return { status: 200, data: 'Success' };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `${input.method}:${input.url}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && input.method === 'GET') {
      return cached;
    }
    
    const response = await ctx.fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    
    const data = await response.json();
    
    if (input.method === 'GET') {
      ctx.cache.set(cacheKey, data);
    }
    
    return data;
  })
  .render(({ data }) => (
    <div className="p-3 bg-gray-50 rounded text-sm">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// Process execution tool
export const processTool = aui
  .tool('process')
  .input(z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    cwd: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate process execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      stdout: `Executed: ${input.command} ${input.args?.join(' ') || ''}`,
      stderr: '',
      exitCode: 0
    };
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      <div className="text-green-600">{data.stdout}</div>
      {data.stderr && <div className="text-red-600">{data.stderr}</div>}
      <div className="text-gray-500">Exit code: {data.exitCode}</div>
    </div>
  ));

// State management tool
export const stateTool = aui
  .tool('state')
  .input(z.object({
    action: z.enum(['get', 'set', 'delete']),
    key: z.string(),
    value: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate state management
    const store = globalThis as any;
    store.__auiState = store.__auiState || {};
    
    switch (input.action) {
      case 'set':
        store.__auiState[input.key] = input.value;
        return { key: input.key, value: input.value };
      case 'get':
        return { key: input.key, value: store.__auiState[input.key] };
      case 'delete':
        delete store.__auiState[input.key];
        return { key: input.key, deleted: true };
      default:
        return { error: 'Unknown action' };
    }
  })
  .render(({ data }) => (
    <div className="p-2 bg-blue-50 rounded text-sm">
      <div className="font-semibold">{data.key}</div>
      {data.value && <pre className="text-xs mt-1">{JSON.stringify(data.value, null, 2)}</pre>}
      {data.deleted && <div className="text-red-600">Deleted</div>}
    </div>
  ));

// Notification tool
export const notificationTool = aui
  .tool('notification')
  .input(z.object({
    type: z.enum(['info', 'success', 'warning', 'error']),
    title: z.string(),
    message: z.string(),
    duration: z.number().optional()
  }))
  .execute(async ({ input }) => {
    return { shown: true, ...input };
  })
  .clientExecute(async ({ input }) => {
    // In a real app, this would trigger a toast notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(input.title, { body: input.message });
      }
    }
    return { shown: true, ...input };
  })
  .render(({ data }) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return (
      <div className={`p-3 rounded-lg ${colors[data.type]}`}>
        <div className="font-semibold">{data.title}</div>
        <div className="text-sm mt-1">{data.message}</div>
      </div>
    );
  });

// User profile tool with client-side caching
export const userProfileTool = aui
  .tool('userProfile')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: fetch from database
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      id: input.userId,
      name: `User ${input.userId}`,
      email: `user${input.userId}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${input.userId}`,
      lastActive: new Date().toISOString()
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `user:${input.userId}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
    
    const response = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'userProfile', input })
    });
    
    const data = await response.json();
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Loading profile...</div>;
    if (error) return <div>Error: {error.message}</div>;
    
    return (
      <div className="flex items-center space-x-4 p-4 border rounded">
        <img src={data.avatar} alt={data.name} className="w-12 h-12 rounded-full" />
        <div>
          <h3 className="font-semibold">{data.name}</h3>
          <p className="text-sm text-gray-600">{data.email}</p>
          <p className="text-xs text-gray-400">Active: {new Date(data.lastActive).toLocaleString()}</p>
        </div>
      </div>
    );
  });

// Helper components
const SearchResults: React.FC<{ results: any[] }> = ({ results }) => (
  <div className="space-y-2">
    {results.map((result, i) => (
      <div key={i} className="p-2 border rounded">
        <h3 className="font-semibold">{result.title}</h3>
        <p className="text-sm text-gray-600">{result.description}</p>
      </div>
    ))}
  </div>
);

// Simulate database search
async function simulateDbSearch(query: string): Promise<any[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [
    { title: `Result 1 for "${query}"`, description: 'First matching result' },
    { title: `Result 2 for "${query}"`, description: 'Second matching result' },
    { title: `Result 3 for "${query}"`, description: 'Third matching result' },
  ];
}