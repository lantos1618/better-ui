import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Production-Ready Tool Examples with Error Handling, Retry, and Caching

// 1. API Gateway Tool - Handle all API calls with retry and caching
const apiGatewayTool = aui
  .tool('api-gateway')
  .input(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    body: z.any().optional(),
    headers: z.record(z.string()).optional(),
    retries: z.number().default(3),
    cacheKey: z.string().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    if (input.method === 'GET' && input.cacheKey) {
      const cached = ctx.cache.get(input.cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }
    }

    // Retry logic
    let lastError;
    for (let i = 0; i < input.retries; i++) {
      try {
        const response = await ctx.fetch(input.endpoint, {
          method: input.method,
          headers: {
            'Content-Type': 'application/json',
            ...input.headers
          },
          body: input.body ? JSON.stringify(input.body) : undefined
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache GET requests
        if (input.method === 'GET' && input.cacheKey) {
          ctx.cache.set(input.cacheKey, {
            data,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
          });
        }

        return data;
      } catch (error) {
        lastError = error;
        if (i < input.retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div className="animate-pulse">Loading...</div>;
    if (error) return <div className="text-red-500">Error: {error.message}</div>;
    return <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(data, null, 2)}</pre>;
  });

// 2. State Management Tool - AI can manage application state
const stateManagerTool = aui
  .tool('state-manager')
  .input(z.object({
    action: z.enum(['get', 'set', 'update', 'delete', 'clear']),
    key: z.string().optional(),
    value: z.any().optional(),
    updates: z.record(z.any()).optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Use context cache as state store
    const state = ctx.cache.get('__app_state__') || {};

    switch (input.action) {
      case 'get':
        return input.key ? state[input.key] : state;
      
      case 'set':
        if (!input.key) throw new Error('Key required for set action');
        state[input.key] = input.value;
        ctx.cache.set('__app_state__', state);
        return { success: true, key: input.key, value: input.value };
      
      case 'update':
        if (!input.key) throw new Error('Key required for update action');
        state[input.key] = { ...state[input.key], ...input.updates };
        ctx.cache.set('__app_state__', state);
        return { success: true, key: input.key, value: state[input.key] };
      
      case 'delete':
        if (!input.key) throw new Error('Key required for delete action');
        delete state[input.key];
        ctx.cache.set('__app_state__', state);
        return { success: true, deleted: input.key };
      
      case 'clear':
        ctx.cache.set('__app_state__', {});
        return { success: true, cleared: true };
      
      default:
        throw new Error('Unknown action');
    }
  })
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded">
      <div className="font-semibold">State Operation Result:</div>
      <pre className="mt-2 text-sm">{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// 3. Analytics Tool - Track and report user actions
const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    category: z.enum(['user', 'system', 'error', 'performance']),
    properties: z.record(z.any()).optional(),
    timestamp: z.number().default(() => Date.now())
  }))
  .execute(async ({ input, ctx }) => {
    // In production, send to analytics service
    const analyticsData = {
      ...input,
      sessionId: ctx?.session?.id,
      userId: ctx?.user?.id,
      userAgent: ctx?.headers?.['user-agent'] || 'unknown'
    };

    // Log to server
    console.log('[Analytics]', analyticsData);

    // Store in database (mock)
    return {
      tracked: true,
      eventId: Math.random().toString(36).substring(7),
      ...analyticsData
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side tracking with batching
    const queue = ctx.cache.get('__analytics_queue__') || [];
    queue.push(input);
    ctx.cache.set('__analytics_queue__', queue);

    // Batch send every 10 events or 5 seconds
    if (queue.length >= 10) {
      await ctx.fetch('/api/tools/analytics/batch', {
        method: 'POST',
        body: JSON.stringify({ events: queue })
      });
      ctx.cache.set('__analytics_queue__', []);
    }

    return { queued: true, queueLength: queue.length };
  })
  .render(({ data }) => (
    <div className="text-green-600 text-sm">
      ✓ Event tracked: {JSON.stringify(data)}
    </div>
  ));

// 4. File Upload Tool - Handle file uploads with progress
const fileUploadTool = aui
  .tool('file-upload')
  .input(z.object({
    file: z.instanceof(File).or(z.string()), // File or base64
    destination: z.string(),
    onProgress: z.function().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    const formData = new FormData();
    
    if (typeof input.file === 'string') {
      // Convert base64 to blob
      const response = await fetch(input.file);
      const blob = await response.blob();
      formData.append('file', blob);
    } else {
      formData.append('file', input.file);
    }
    
    formData.append('destination', input.destination);

    // Upload with progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && input.onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          input.onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  })
  .render(({ data, loading }) => {
    if (loading) {
      return (
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="bg-blue-600 h-4 rounded-full animate-pulse" style={{ width: '50%' }}></div>
        </div>
      );
    }
    return <div className="text-green-600">✓ File uploaded: {data?.url}</div>;
  });

// 5. WebSocket Tool - Real-time communication
const websocketTool = aui
  .tool('websocket')
  .input(z.object({
    action: z.enum(['connect', 'send', 'disconnect']),
    url: z.string().optional(),
    message: z.any().optional(),
    room: z.string().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    let ws = ctx.cache.get('__websocket__');

    switch (input.action) {
      case 'connect':
        if (ws) ws.close();
        ws = new WebSocket(input.url || 'ws://localhost:3000');
        
        ws.onopen = () => console.log('WebSocket connected');
        ws.onmessage = (event) => {
          const handlers = ctx.cache.get('__ws_handlers__') || [];
          handlers.forEach((handler: Function) => handler(event.data));
        };
        ws.onerror = (error) => console.error('WebSocket error:', error);
        
        ctx.cache.set('__websocket__', ws);
        return { connected: true, url: input.url };

      case 'send':
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket not connected');
        }
        ws.send(JSON.stringify(input.message));
        return { sent: true, message: input.message };

      case 'disconnect':
        if (ws) {
          ws.close();
          ctx.cache.delete('__websocket__');
        }
        return { disconnected: true };

      default:
        throw new Error('Unknown action');
    }
  })
  .render(({ data }) => (
    <div className="p-2 bg-gray-100 rounded">
      WebSocket: {JSON.stringify(data)}
    </div>
  ));

// 6. Notification Tool - Show user notifications
const notificationTool = aui
  .tool('notification')
  .input(z.object({
    type: z.enum(['success', 'error', 'warning', 'info']),
    title: z.string(),
    message: z.string().optional(),
    duration: z.number().default(5000),
    action: z.object({
      label: z.string(),
      handler: z.function()
    }).optional()
  }))
  .clientExecute(async ({ input }) => {
    // Check if browser supports notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(input.title, {
        body: input.message,
        icon: `/icons/${input.type}.png`,
        badge: '/badge.png'
      });

      setTimeout(() => notification.close(), input.duration);

      if (input.action) {
        notification.onclick = input.action.handler;
      }

      return { shown: true, native: true };
    }

    // Fallback to in-app notification
    return { shown: true, native: false, ...input };
  })
  .render(({ data }) => {
    const colors = {
      success: 'bg-green-100 text-green-800 border-green-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <div className={`p-4 rounded-lg border ${colors[data.type as keyof typeof colors]}`}>
        <div className="font-semibold">{data.title}</div>
        {data.message && <div className="mt-1 text-sm">{data.message}</div>}
        {data.action && (
          <button 
            onClick={data.action.handler}
            className="mt-2 text-sm underline"
          >
            {data.action.label}
          </button>
        )}
      </div>
    );
  });

// 7. Database Query Builder - AI can build and execute complex queries
const queryBuilderTool = aui
  .tool('query-builder')
  .input(z.object({
    table: z.string(),
    operation: z.enum(['select', 'insert', 'update', 'delete']),
    columns: z.array(z.string()).optional(),
    where: z.record(z.any()).optional(),
    orderBy: z.object({
      column: z.string(),
      direction: z.enum(['asc', 'desc'])
    }).optional(),
    limit: z.number().optional(),
    data: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Build SQL query (simplified for demo)
    let query = '';
    const params: any[] = [];

    switch (input.operation) {
      case 'select':
        query = `SELECT ${input.columns?.join(', ') || '*'} FROM ${input.table}`;
        if (input.where) {
          const conditions = Object.entries(input.where).map(([key, value]) => {
            params.push(value);
            return `${key} = $${params.length}`;
          });
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
        if (input.orderBy) {
          query += ` ORDER BY ${input.orderBy.column} ${input.orderBy.direction}`;
        }
        if (input.limit) {
          query += ` LIMIT ${input.limit}`;
        }
        break;

      case 'insert':
        const keys = Object.keys(input.data || {});
        const values = Object.values(input.data || {});
        query = `INSERT INTO ${input.table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`;
        params.push(...values);
        break;

      case 'update':
        const updates = Object.entries(input.data || {}).map(([key, value]) => {
          params.push(value);
          return `${key} = $${params.length}`;
        });
        query = `UPDATE ${input.table} SET ${updates.join(', ')}`;
        if (input.where) {
          const conditions = Object.entries(input.where).map(([key, value]) => {
            params.push(value);
            return `${key} = $${params.length}`;
          });
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
        break;

      case 'delete':
        query = `DELETE FROM ${input.table}`;
        if (input.where) {
          const conditions = Object.entries(input.where).map(([key, value]) => {
            params.push(value);
            return `${key} = $${params.length}`;
          });
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
        break;
    }

    // In production, execute against real database
    return {
      query,
      params,
      result: 'Mock result - connect to real database'
    };
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      <div className="bg-gray-800 text-white p-3 rounded-t">SQL Query:</div>
      <div className="bg-gray-900 text-green-400 p-3 rounded-b">
        {data.query}
        {data.params.length > 0 && (
          <div className="mt-2 text-blue-400">
            Params: {JSON.stringify(data.params)}
          </div>
        )}
      </div>
    </div>
  ));

// Export all production tools
export {
  apiGatewayTool,
  stateManagerTool,
  analyticsTool,
  fileUploadTool,
  websocketTool,
  notificationTool,
  queryBuilderTool
};

// Tool registry for AI discovery
export const productionTools = [
  apiGatewayTool,
  stateManagerTool,
  analyticsTool,
  fileUploadTool,
  websocketTool,
  notificationTool,
  queryBuilderTool
];

// Helper to register all tools
export function registerProductionTools() {
  productionTools.forEach(tool => {
    console.log(`Registered production tool: ${tool.name}`);
  });
  return productionTools;
}