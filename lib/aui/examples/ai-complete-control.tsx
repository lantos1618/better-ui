import React from 'react';
import aui from '../index';
import { z } from 'zod';

// ============================================================================
// AI Complete Control System - Frontend & Backend Tool Examples
// ============================================================================

// 1. Frontend State Management Tool
const stateManagementTool = aui
  .tool('state-management')
  .describe('Control application state from AI')
  .input(z.object({
    action: z.enum(['set', 'get', 'update', 'reset']),
    key: z.string(),
    value: z.any().optional(),
  }))
  .clientExecute(async ({ input, ctx }) => {
    const store = (globalThis as any).__aiStore || ((globalThis as any).__aiStore = new Map());
    
    switch (input.action) {
      case 'set':
        store.set(input.key, input.value);
        return { key: input.key, value: input.value, action: 'set' };
      case 'get':
        return { key: input.key, value: store.get(input.key), action: 'get' };
      case 'update':
        const current = store.get(input.key);
        const updated = typeof current === 'object' 
          ? { ...current, ...input.value }
          : input.value;
        store.set(input.key, updated);
        return { key: input.key, value: updated, action: 'update' };
      case 'reset':
        store.clear();
        return { action: 'reset', cleared: true };
    }
  })
  .render(({ data }) => (
    <div className="p-2 bg-blue-50 rounded">
      <span className="font-mono text-sm">
        State: {data.action} {data.key && `[${data.key}]`}
      </span>
    </div>
  ));

// 2. Navigation Control Tool
const navigationTool = aui
  .tool('navigation')
  .describe('Control app navigation and routing')
  .input(z.object({
    action: z.enum(['navigate', 'back', 'forward', 'reload']),
    path: z.string().optional(),
    query: z.record(z.string()).optional(),
  }))
  .clientExecute(async ({ input }) => {
    switch (input.action) {
      case 'navigate':
        if (input.path) {
          const url = new URL(input.path, window.location.origin);
          if (input.query) {
            Object.entries(input.query).forEach(([key, value]) => {
              url.searchParams.set(key, value);
            });
          }
          window.history.pushState({}, '', url.toString());
        }
        break;
      case 'back':
        window.history.back();
        break;
      case 'forward':
        window.history.forward();
        break;
      case 'reload':
        window.location.reload();
        break;
    }
    return { 
      action: input.action, 
      path: input.path || window.location.pathname,
      success: true 
    };
  })
  .render(({ data }) => (
    <div className="text-green-600">
      ✓ Navigation: {data.action} → {data.path}
    </div>
  ));

// 3. DOM Manipulation Tool
const domTool = aui
  .tool('dom-manipulation')
  .describe('Direct DOM manipulation capabilities')
  .input(z.object({
    selector: z.string(),
    action: z.enum(['addClass', 'removeClass', 'setAttribute', 'setStyle', 'setText', 'remove']),
    value: z.any().optional(),
  }))
  .clientExecute(async ({ input }) => {
    const elements = document.querySelectorAll(input.selector);
    if (elements.length === 0) {
      throw new Error(`No elements found for selector: ${input.selector}`);
    }
    
    elements.forEach(el => {
      const element = el as HTMLElement;
      switch (input.action) {
        case 'addClass':
          element.classList.add(input.value);
          break;
        case 'removeClass':
          element.classList.remove(input.value);
          break;
        case 'setAttribute':
          if (typeof input.value === 'object') {
            Object.entries(input.value).forEach(([key, val]) => {
              element.setAttribute(key, String(val));
            });
          }
          break;
        case 'setStyle':
          if (typeof input.value === 'object') {
            Object.assign(element.style, input.value);
          }
          break;
        case 'setText':
          element.textContent = String(input.value);
          break;
        case 'remove':
          element.remove();
          break;
      }
    });
    
    return { 
      selector: input.selector, 
      action: input.action, 
      affected: elements.length 
    };
  })
  .render(({ data }) => (
    <div className="text-sm text-gray-600">
      DOM: {data.action} on {data.affected} element(s)
    </div>
  ));

// 4. API Request Tool
const apiTool = aui
  .tool('api-request')
  .describe('Make API requests to backend services')
  .input(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    endpoint: z.string(),
    body: z.any().optional(),
    headers: z.record(z.string()).optional(),
  }))
  .execute(async ({ input, ctx }) => {
    const response = await ctx!.fetch(input.endpoint, {
      method: input.method,
      headers: {
        'Content-Type': 'application/json',
        ...input.headers,
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
    });
    
    const data = await response.json();
    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cacheKey = `${input.method}:${input.endpoint}`;
    
    if (input.method === 'GET') {
      const cached = ctx.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return cached.data;
      }
    }
    
    const response = await fetch(input.endpoint, {
      method: input.method,
      headers: {
        'Content-Type': 'application/json',
        ...input.headers,
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
    });
    
    const data = await response.json();
    const result = {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
    
    if (input.method === 'GET') {
      ctx.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    }
    
    return result;
  })
  .render(({ data }) => (
    <div className="p-2 bg-gray-50 rounded">
      <div className="text-sm font-medium">API Response ({data.status})</div>
      <pre className="text-xs mt-1">{JSON.stringify(data.data, null, 2)}</pre>
    </div>
  ));

// 5. Database Operations Tool
const dbTool = aui
  .tool('database-ops')
  .describe('Perform database operations')
  .input(z.object({
    operation: z.enum(['query', 'insert', 'update', 'delete', 'transaction']),
    table: z.string(),
    data: z.any().optional(),
    where: z.record(z.any()).optional(),
    transaction: z.array(z.object({
      operation: z.string(),
      table: z.string(),
      data: z.any(),
    })).optional(),
  }))
  .execute(async ({ input }) => {
    // This would connect to your actual database
    // For demo, return mock responses
    switch (input.operation) {
      case 'query':
        return {
          operation: 'query',
          table: input.table,
          results: [
            { id: 1, name: 'Item 1', created: new Date().toISOString() },
            { id: 2, name: 'Item 2', created: new Date().toISOString() },
          ],
          count: 2,
        };
      
      case 'insert':
        return {
          operation: 'insert',
          table: input.table,
          id: Math.floor(Math.random() * 10000),
          data: input.data,
        };
      
      case 'update':
        return {
          operation: 'update',
          table: input.table,
          affected: 1,
          data: input.data,
        };
      
      case 'delete':
        return {
          operation: 'delete',
          table: input.table,
          affected: 1,
          where: input.where,
        };
      
      case 'transaction':
        return {
          operation: 'transaction',
          success: true,
          operations: input.transaction?.length || 0,
        };
      
      default:
        throw new Error('Unknown operation');
    }
  })
  .render(({ data }) => (
    <div className="p-3 bg-green-50 border border-green-200 rounded">
      <div className="font-semibold text-green-800">Database Operation</div>
      <pre className="text-xs mt-2">{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// 6. File System Tool (Server-side)
const fileSystemTool = aui
  .tool('file-system')
  .describe('File system operations')
  .input(z.object({
    operation: z.enum(['read', 'write', 'delete', 'list', 'mkdir']),
    path: z.string(),
    content: z.string().optional(),
    encoding: z.enum(['utf8', 'base64', 'binary']).default('utf8'),
  }))
  .execute(async ({ input }) => {
    // In production, this would use Node.js fs module
    // Mock implementation for demo
    switch (input.operation) {
      case 'read':
        return {
          operation: 'read',
          path: input.path,
          content: `Mock content of ${input.path}`,
          size: 1024,
        };
      
      case 'write':
        return {
          operation: 'write',
          path: input.path,
          written: input.content?.length || 0,
        };
      
      case 'delete':
        return {
          operation: 'delete',
          path: input.path,
          success: true,
        };
      
      case 'list':
        return {
          operation: 'list',
          path: input.path,
          files: ['file1.txt', 'file2.json', 'dir/'],
        };
      
      case 'mkdir':
        return {
          operation: 'mkdir',
          path: input.path,
          created: true,
        };
      
      default:
        throw new Error('Unknown operation');
    }
  })
  .render(({ data }) => (
    <div className="font-mono text-xs p-2 bg-black text-green-400 rounded">
      {data.operation} → {JSON.stringify(data, null, 2)}
    </div>
  ));

// 7. Process Management Tool
const processTool = aui
  .tool('process-management')
  .describe('Manage server processes and tasks')
  .input(z.object({
    action: z.enum(['spawn', 'kill', 'list', 'status']),
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    pid: z.number().optional(),
  }))
  .execute(async ({ input }) => {
    // Mock process management
    switch (input.action) {
      case 'spawn':
        return {
          action: 'spawn',
          command: input.command,
          pid: Math.floor(Math.random() * 10000),
          status: 'running',
        };
      
      case 'kill':
        return {
          action: 'kill',
          pid: input.pid,
          success: true,
        };
      
      case 'list':
        return {
          action: 'list',
          processes: [
            { pid: 1234, command: 'node', status: 'running' },
            { pid: 5678, command: 'npm', status: 'running' },
          ],
        };
      
      case 'status':
        return {
          action: 'status',
          pid: input.pid,
          status: 'running',
          memory: '45MB',
          cpu: '2.3%',
        };
      
      default:
        throw new Error('Unknown action');
    }
  })
  .render(({ data }) => (
    <div className="p-2 bg-purple-50 rounded">
      <div className="text-purple-700 font-medium">Process: {data.action}</div>
      <pre className="text-xs mt-1">{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// 8. WebSocket Tool for Real-time Communication
const websocketTool = aui
  .tool('websocket')
  .describe('Real-time bidirectional communication')
  .input(z.object({
    action: z.enum(['connect', 'send', 'disconnect', 'subscribe']),
    url: z.string().optional(),
    message: z.any().optional(),
    channel: z.string().optional(),
  }))
  .clientExecute(async ({ input }) => {
    const wsStore = (globalThis as any).__wsStore || ((globalThis as any).__wsStore = new Map());
    
    switch (input.action) {
      case 'connect':
        if (input.url) {
          const ws = new WebSocket(input.url);
          wsStore.set('main', ws);
          return { action: 'connect', url: input.url, status: 'connecting' };
        }
        break;
      
      case 'send':
        const ws = wsStore.get('main');
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(input.message));
          return { action: 'send', sent: true };
        }
        throw new Error('WebSocket not connected');
      
      case 'disconnect':
        const connection = wsStore.get('main');
        if (connection) {
          connection.close();
          wsStore.delete('main');
        }
        return { action: 'disconnect', success: true };
      
      case 'subscribe':
        return { action: 'subscribe', channel: input.channel, subscribed: true };
    }
    
    return { action: input.action, success: true };
  })
  .render(({ data }) => (
    <div className="text-blue-600 text-sm">
      WS: {data.action} {data.status || (data.sent ? '✓' : '')}
    </div>
  ));

// Export all tools
export const aiControlTools = {
  stateManagementTool,
  navigationTool,
  domTool,
  apiTool,
  dbTool,
  fileSystemTool,
  processTool,
  websocketTool,
};

// Helper function to register all tools
export function registerAIControlTools() {
  Object.values(aiControlTools).forEach(tool => {
    // Tools are automatically registered when created with aui.tool()
    console.log(`Registered tool: ${tool.name}`);
  });
}

// Example usage for AI agents
export const aiToolsManifest = {
  version: '1.0.0',
  tools: Object.entries(aiControlTools).map(([key, tool]) => ({
    name: tool.name,
    description: tool.description,
    category: key.includes('Tool') ? key.replace('Tool', '') : key,
    capabilities: {
      frontend: ['state', 'navigation', 'dom', 'websocket'].some(cap => key.includes(cap)),
      backend: ['db', 'fileSystem', 'process', 'api'].some(cap => key.includes(cap)),
    },
  })),
};