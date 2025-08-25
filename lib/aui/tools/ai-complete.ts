import aui from '../index';
import { z } from 'zod';

// Navigation control - AI can navigate the app
export const navigationTool = aui
  .tool('navigate')
  .input(z.object({
    action: z.enum(['goto', 'back', 'forward', 'reload', 'open']),
    url: z.string().optional(),
    target: z.enum(['_self', '_blank', '_parent', '_top']).optional()
  }))
  .clientExecute(async ({ input }) => {
    switch (input.action) {
      case 'goto':
        if (!input.url) throw new Error('URL required for goto action');
        window.location.href = input.url;
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
      case 'open':
        if (!input.url) throw new Error('URL required for open action');
        window.open(input.url, input.target || '_blank');
        break;
    }
    return { success: true, action: input.action, url: input.url };
  })
  .describe('Control browser navigation')
  .tag('ai', 'navigation', 'client');

// State management - AI can manage application state
export const stateTool = aui
  .tool('state-manager')
  .input(z.object({
    action: z.enum(['set', 'get', 'update', 'delete', 'clear']),
    key: z.string().optional(),
    value: z.any().optional(),
    namespace: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const storage = input.namespace === 'session' ? sessionStorage : localStorage;
    
    switch (input.action) {
      case 'set':
        if (!input.key) throw new Error('Key required for set action');
        storage.setItem(input.key, JSON.stringify(input.value));
        return { success: true, key: input.key, value: input.value };
      
      case 'get':
        if (!input.key) throw new Error('Key required for get action');
        const value = storage.getItem(input.key);
        return { success: true, key: input.key, value: value ? JSON.parse(value) : null };
      
      case 'update':
        if (!input.key) throw new Error('Key required for update action');
        const existing = storage.getItem(input.key);
        const current = existing ? JSON.parse(existing) : {};
        const updated = { ...current, ...input.value };
        storage.setItem(input.key, JSON.stringify(updated));
        return { success: true, key: input.key, value: updated };
      
      case 'delete':
        if (!input.key) throw new Error('Key required for delete action');
        storage.removeItem(input.key);
        return { success: true, key: input.key, deleted: true };
      
      case 'clear':
        storage.clear();
        return { success: true, cleared: true };
      
      default:
        throw new Error('Unknown action');
    }
  })
  .describe('Manage client-side state storage')
  .tag('ai', 'state', 'client');

// API calls - AI can make API requests
export const apiTool = aui
  .tool('api-call')
  .input(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    url: z.string(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    queryParams: z.record(z.string()).optional()
  }))
  .execute(async ({ input }) => {
    const url = new URL(input.url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    if (input.queryParams) {
      Object.entries(input.queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    const options: RequestInit = {
      method: input.method,
      headers: {
        'Content-Type': 'application/json',
        ...input.headers
      }
    };
    
    if (input.body && input.method !== 'GET') {
      options.body = JSON.stringify(input.body);
    }
    
    const response = await fetch(url.toString(), options);
    const data = await response.json();
    
    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  })
  .describe('Make HTTP API requests')
  .tag('ai', 'api', 'network');

// File operations - AI can handle files
export const fileTool = aui
  .tool('file-handler')
  .input(z.object({
    action: z.enum(['read', 'download', 'upload']),
    file: z.any().optional(),
    url: z.string().optional(),
    filename: z.string().optional(),
    content: z.string().optional(),
    mimeType: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    switch (input.action) {
      case 'download':
        if (!input.content || !input.filename) {
          throw new Error('Content and filename required for download');
        }
        const blob = new Blob([input.content], { 
          type: input.mimeType || 'text/plain' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = input.filename;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, filename: input.filename };
      
      case 'read':
        if (!input.file) throw new Error('File required for read action');
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              success: true,
              content: e.target?.result,
              filename: input.file.name,
              size: input.file.size,
              type: input.file.type
            });
          };
          reader.readAsText(input.file);
        });
      
      case 'upload':
        // This would typically upload to a server
        return { success: true, message: 'Upload handler not implemented' };
      
      default:
        throw new Error('Unknown action');
    }
  })
  .describe('Handle file operations')
  .tag('ai', 'file', 'client');

// Notification system - AI can send notifications
export const notificationTool = aui
  .tool('notification')
  .input(z.object({
    type: z.enum(['info', 'success', 'warning', 'error', 'toast']),
    title: z.string(),
    message: z.string().optional(),
    duration: z.number().optional(),
    position: z.enum(['top', 'bottom', 'top-right', 'top-left', 'bottom-right', 'bottom-left']).optional()
  }))
  .clientExecute(async ({ input }) => {
    // Check if browser supports notifications
    if (input.type !== 'toast' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      
      if (Notification.permission === 'granted') {
        new Notification(input.title, {
          body: input.message,
          icon: `/icon-${input.type}.png`,
          tag: input.type,
        });
        return { success: true, type: 'notification' };
      }
    }
    
    // Fallback to toast
    const toast = document.createElement('div');
    toast.className = `fixed z-50 p-4 rounded-lg shadow-lg ${
      input.type === 'error' ? 'bg-red-500' :
      input.type === 'warning' ? 'bg-yellow-500' :
      input.type === 'success' ? 'bg-green-500' :
      'bg-blue-500'
    } text-white`;
    
    // Position the toast
    const position = input.position || 'top-right';
    if (position.includes('top')) toast.style.top = '20px';
    if (position.includes('bottom')) toast.style.bottom = '20px';
    if (position.includes('right')) toast.style.right = '20px';
    if (position.includes('left')) toast.style.left = '20px';
    if (!position.includes('left') && !position.includes('right')) {
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
    }
    
    toast.innerHTML = `
      <div class="font-semibold">${input.title}</div>
      ${input.message ? `<div class="text-sm mt-1">${input.message}</div>` : ''}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, input.duration || 3000);
    
    return { success: true, type: 'toast' };
  })
  .describe('Show notifications to the user')
  .tag('ai', 'notification', 'ui');

// Analytics tracking - AI can track events
export const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    action: z.enum(['track', 'identify', 'page', 'group']),
    event: z.string().optional(),
    properties: z.record(z.any()).optional(),
    userId: z.string().optional(),
    traits: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // This would integrate with your analytics provider
    console.log('Analytics event:', input);
    
    // Simulate sending to analytics service
    const analyticsData = {
      timestamp: new Date().toISOString(),
      ...input
    };
    
    // In production, this would send to Google Analytics, Segment, etc.
    return {
      success: true,
      tracked: analyticsData
    };
  })
  .describe('Track analytics events')
  .tag('ai', 'analytics', 'tracking');

// Database query builder - AI can build and execute queries
export const queryBuilderTool = aui
  .tool('query-builder')
  .input(z.object({
    table: z.string(),
    operation: z.enum(['select', 'insert', 'update', 'delete']),
    columns: z.array(z.string()).optional(),
    where: z.record(z.any()).optional(),
    data: z.record(z.any()).optional(),
    orderBy: z.object({
      column: z.string(),
      direction: z.enum(['asc', 'desc'])
    }).optional(),
    limit: z.number().optional(),
    offset: z.number().optional()
  }))
  .execute(async ({ input }) => {
    // Build SQL-like query (this is a simulation)
    let query = '';
    
    switch (input.operation) {
      case 'select':
        query = `SELECT ${input.columns?.join(', ') || '*'} FROM ${input.table}`;
        if (input.where) {
          const conditions = Object.entries(input.where)
            .map(([key, value]) => `${key} = '${value}'`)
            .join(' AND ');
          query += ` WHERE ${conditions}`;
        }
        if (input.orderBy) {
          query += ` ORDER BY ${input.orderBy.column} ${input.orderBy.direction.toUpperCase()}`;
        }
        if (input.limit) query += ` LIMIT ${input.limit}`;
        if (input.offset) query += ` OFFSET ${input.offset}`;
        break;
      
      case 'insert':
        if (!input.data) throw new Error('Data required for insert');
        const columns = Object.keys(input.data);
        const values = Object.values(input.data).map(v => `'${v}'`);
        query = `INSERT INTO ${input.table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
        break;
      
      case 'update':
        if (!input.data) throw new Error('Data required for update');
        const updates = Object.entries(input.data)
          .map(([key, value]) => `${key} = '${value}'`)
          .join(', ');
        query = `UPDATE ${input.table} SET ${updates}`;
        if (input.where) {
          const conditions = Object.entries(input.where)
            .map(([key, value]) => `${key} = '${value}'`)
            .join(' AND ');
          query += ` WHERE ${conditions}`;
        }
        break;
      
      case 'delete':
        query = `DELETE FROM ${input.table}`;
        if (input.where) {
          const conditions = Object.entries(input.where)
            .map(([key, value]) => `${key} = '${value}'`)
            .join(' AND ');
          query += ` WHERE ${conditions}`;
        }
        break;
    }
    
    // In production, this would execute against a real database
    return {
      success: true,
      query,
      operation: input.operation,
      table: input.table,
      // Simulated results
      results: input.operation === 'select' ? [
        { id: 1, name: 'Sample 1' },
        { id: 2, name: 'Sample 2' }
      ] : { affectedRows: 1 }
    };
  })
  .describe('Build and execute database queries')
  .tag('ai', 'database', 'query');

// Export all AI control tools
export const aiCompleteTools = {
  navigationTool,
  stateTool,
  apiTool,
  fileTool,
  notificationTool,
  analyticsTool,
  queryBuilderTool
};

// Register all tools
Object.values(aiCompleteTools).forEach(tool => {
  // Tools are auto-registered when created with aui.tool()
});

export default aiCompleteTools;