// Advanced AUI Tool Examples for AI Control
import aui, { z } from '../index';
import React from 'react';

// Database operations tool - allows AI to query and modify data
export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['query', 'insert', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional(),
    where: z.record(z.any()).optional(),
    select: z.array(z.string()).optional()
  }))
  .execute(async ({ input }) => {
    // Simulate database operations
    const operations = {
      query: async () => ({
        rows: [
          { id: 1, name: 'Item 1', status: 'active' },
          { id: 2, name: 'Item 2', status: 'pending' }
        ],
        count: 2
      }),
      insert: async () => ({ 
        inserted: true, 
        id: Math.floor(Math.random() * 1000),
        data: input.data 
      }),
      update: async () => ({ 
        updated: true, 
        affected: 1,
        where: input.where 
      }),
      delete: async () => ({ 
        deleted: true, 
        affected: 1 
      })
    };
    
    return await operations[input.operation]();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with transaction batching
    const batchKey = 'db-batch';
    const batch = ctx.cache.get(batchKey) || [];
    
    if (input.operation === 'query') {
      // Queries execute immediately
      return await ctx.fetch('/api/aui/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'database', input })
      }).then(r => r.json());
    }
    
    // Batch write operations
    batch.push(input);
    ctx.cache.set(batchKey, batch);
    
    // Execute batch after delay
    setTimeout(async () => {
      const pending = ctx.cache.get(batchKey);
      if (pending?.length) {
        ctx.cache.delete(batchKey);
        await ctx.fetch('/api/aui/batch', {
          method: 'POST',
          body: JSON.stringify({ operations: pending })
        });
      }
    }, 100);
    
    return { batched: true, operation: input.operation };
  })
  .render(({ data }) => (
    <div className="p-4 bg-purple-50 rounded-lg">
      <h4 className="font-semibold mb-2">Database Result</h4>
      <pre className="text-xs bg-white p-2 rounded">
        {data ? JSON.stringify(data, null, 2) : 'No data'}
      </pre>
    </div>
  ));

// File system operations tool - allows AI to read/write files
export const fileSystemTool = aui
  .tool('filesystem')
  .input(z.object({
    operation: z.enum(['read', 'write', 'list', 'delete', 'mkdir']),
    path: z.string(),
    content: z.string().optional(),
    encoding: z.enum(['utf8', 'base64']).default('utf8')
  }))
  .execute(async ({ input }) => {
    // Server-side file operations (would use fs in real implementation)
    switch (input.operation) {
      case 'read':
        return { 
          content: `Contents of ${input.path}`,
          size: 1024,
          modified: new Date().toISOString()
        };
      case 'write':
        return { 
          written: true, 
          path: input.path,
          size: input.content?.length || 0
        };
      case 'list':
        return {
          files: ['file1.ts', 'file2.tsx', 'config.json'],
          directories: ['src', 'lib', 'app']
        };
      case 'delete':
        return { deleted: true, path: input.path };
      case 'mkdir':
        return { created: true, path: input.path };
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
  })
  .render(({ data, input }) => (
    <div className="p-4 bg-yellow-50 rounded-lg">
      <h4 className="font-semibold mb-2">File System: {input?.operation}</h4>
      <code className="text-xs text-gray-600">{input?.path}</code>
      <pre className="mt-2 text-xs bg-white p-2 rounded">
        {data ? JSON.stringify(data, null, 2) : 'No data'}
      </pre>
    </div>
  ));

// API integration tool - allows AI to make HTTP requests
export const apiTool = aui
  .tool('api')
  .input(z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    timeout: z.number().default(5000)
  }))
  .execute(async ({ input }) => {
    // Server-side API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), input.timeout);
    
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body ? JSON.stringify(input.body) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json().catch(() => response.text());
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with CORS proxy fallback
    try {
      const response = await ctx.fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body ? JSON.stringify(input.body) : undefined
      });
      
      const data = await response.json().catch(() => response.text());
      return {
        status: response.status,
        statusText: response.statusText,
        data
      };
    } catch (error) {
      // Fallback to server proxy for CORS issues
      return await ctx.fetch('/api/aui/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'api', input })
      }).then(r => r.json());
    }
  })
  .render(({ data, input }) => (
    <div className="p-4 bg-green-50 rounded-lg">
      <h4 className="font-semibold mb-2">
        {input?.method} {input?.url}
      </h4>
      <div className="text-sm text-gray-600 mb-2">
        Status: {data?.status || 'N/A'} {data?.statusText || ''}
      </div>
      <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-64">
        {data ? (typeof data.data === 'string' 
          ? data.data 
          : JSON.stringify(data.data, null, 2)) : 'No data'}
      </pre>
    </div>
  ));

// Process execution tool - allows AI to run commands
export const processTool = aui
  .tool('process')
  .input(z.object({
    command: z.string(),
    args: z.array(z.string()).default([]),
    cwd: z.string().optional(),
    env: z.record(z.string()).optional(),
    timeout: z.number().default(10000)
  }))
  .execute(async ({ input }) => {
    // Server-only execution for security
    // In real implementation, would use child_process
    return {
      stdout: `Output from: ${input.command} ${input.args?.join(' ') || ''}`,
      stderr: '',
      exitCode: 0,
      duration: Math.floor(Math.random() * 1000)
    };
  })
  .render(({ data, input }) => (
    <div className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm">
      <div className="text-gray-400 mb-2">$ {input?.command} {input?.args?.join(' ')}</div>
      {data?.stdout && <div className="whitespace-pre">{data.stdout}</div>}
      {data?.stderr && <div className="text-red-400 whitespace-pre">{data.stderr}</div>}
      {data?.exitCode !== undefined && (
        <div className="text-gray-400 mt-2">
          Exit code: {data.exitCode} | Duration: {data?.duration || 0}ms
        </div>
      )}
    </div>
  ));

// State management tool - allows AI to manage application state
export const stateTool = aui
  .tool('state')
  .input(z.object({
    action: z.enum(['get', 'set', 'update', 'delete', 'clear']),
    key: z.string().optional(),
    value: z.any().optional(),
    updater: z.function().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side state (would use Redis/database in production)
    const state = new Map();
    
    switch (input.action) {
      case 'get':
        return { value: state.get(input.key), exists: state.has(input.key) };
      case 'set':
        state.set(input.key, input.value);
        return { updated: true, key: input.key };
      case 'update':
        const current = state.get(input.key);
        const updated = input.updater ? input.updater(current) : { ...current, ...input.value };
        state.set(input.key, updated);
        return { updated: true, previous: current, new: updated };
      case 'delete':
        const deleted = state.delete(input.key);
        return { deleted, key: input.key };
      case 'clear':
        state.clear();
        return { cleared: true };
      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with localStorage
    const storage = globalThis.localStorage;
    const prefix = 'aui-state:';
    
    switch (input.action) {
      case 'get':
        const value = storage.getItem(prefix + input.key);
        return { 
          value: value ? JSON.parse(value) : null, 
          exists: value !== null 
        };
      case 'set':
        storage.setItem(prefix + input.key!, JSON.stringify(input.value));
        return { updated: true, key: input.key };
      case 'delete':
        storage.removeItem(prefix + input.key!);
        return { deleted: true, key: input.key };
      case 'clear':
        Object.keys(storage)
          .filter(k => k.startsWith(prefix))
          .forEach(k => storage.removeItem(k));
        return { cleared: true };
      default:
        // Fallback to server for complex operations
        return await ctx.fetch('/api/aui/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'state', input })
        }).then(r => r.json());
    }
  })
  .render(({ data, input }) => (
    <div className="p-4 bg-indigo-50 rounded-lg">
      <h4 className="font-semibold mb-2">State: {input?.action}</h4>
      {input?.key && <code className="text-sm text-gray-600">{input.key}</code>}
      <pre className="mt-2 text-xs bg-white p-2 rounded">
        {data ? JSON.stringify(data, null, 2) : 'No data'}
      </pre>
    </div>
  ));

// Notification tool - allows AI to send notifications
export const notificationTool = aui
  .tool('notification')
  .input(z.object({
    type: z.enum(['info', 'success', 'warning', 'error']),
    title: z.string(),
    message: z.string(),
    duration: z.number().default(5000),
    action: z.object({
      label: z.string(),
      url: z.string().optional(),
      callback: z.string().optional()
    }).optional()
  }))
  .execute(async ({ input }) => {
    // Server-side could send emails, SMS, push notifications
    return {
      sent: true,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9),
      ...input
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(input.title, {
        body: input.message,
        icon: `/icons/${input.type}.png`,
        tag: 'aui-notification'
      });
    }
    
    // Also store in context for UI rendering
    const notifications = ctx.cache.get('notifications') || [];
    const notification = {
      ...input,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      sent: true
    };
    notifications.push(notification);
    ctx.cache.set('notifications', notifications);
    
    // Auto-remove after duration
    setTimeout(() => {
      const current = ctx.cache.get('notifications') || [];
      ctx.cache.set(
        'notifications',
        current.filter((n: any) => n.id !== notification.id)
      );
    }, input.duration);
    
    return notification;
  })
  .render(({ data }) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200'
    };
    
    const colorClass = data ? colors[data.type as keyof typeof colors] : colors.info;
    
    return (
      <div className={`p-4 rounded-lg border ${colorClass}`}>
        <h4 className="font-semibold">{data?.title || 'Notification'}</h4>
        <p className="mt-1">{data?.message || 'No message'}</p>
        {data?.action && (
          <button className="mt-2 text-sm underline">
            {data.action.label}
          </button>
        )}
      </div>
    );
  });