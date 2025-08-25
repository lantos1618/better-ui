import aui, { z } from '../index';

// AI Control Tools for Frontend/Backend Operations

// Database operations tool
export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['find', 'create', 'update', 'delete']),
    collection: z.string(),
    query: z.any().optional(),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side database operations
    switch (input.operation) {
      case 'find':
        return { results: [], count: 0 }; // Mock implementation
      case 'create':
        return { id: crypto.randomUUID(), ...input.data };
      case 'update':
        return { modified: 1 };
      case 'delete':
        return { deleted: 1 };
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side API call
    return ctx.fetch('/api/tools/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
  });

// File system operations tool
export const fileSystemTool = aui
  .tool('filesystem')
  .input(z.object({
    operation: z.enum(['read', 'write', 'list', 'delete']),
    path: z.string(),
    content: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Server-only file operations
    switch (input.operation) {
      case 'read':
        return { content: 'file content', path: input.path };
      case 'write':
        return { success: true, path: input.path };
      case 'list':
        return { files: [], directories: [] };
      case 'delete':
        return { success: true };
    }
  });

// API request tool for external services
export const apiRequestTool = aui
  .tool('api_request')
  .input(z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    headers: z.record(z.string()).optional(),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    const response = await fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    return response.json();
  });

// DOM manipulation tool
export const domTool = aui
  .tool('dom_manipulate')
  .input(z.object({
    selector: z.string(),
    action: z.enum(['click', 'type', 'scroll', 'focus', 'getValue']),
    value: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    // Client-only DOM operations
    const element = document.querySelector(input.selector) as HTMLElement;
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    
    switch (input.action) {
      case 'click':
        element.click();
        return { success: true };
      case 'type':
        if (element instanceof HTMLInputElement && input.value) {
          element.value = input.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return { success: true };
      case 'scroll':
        element.scrollIntoView({ behavior: 'smooth' });
        return { success: true };
      case 'focus':
        element.focus();
        return { success: true };
      case 'getValue':
        return { value: (element as HTMLInputElement).value || element.textContent };
    }
  });

// State management tool
export const stateTool = aui
  .tool('state')
  .input(z.object({
    action: z.enum(['get', 'set', 'update', 'subscribe']),
    key: z.string(),
    value: z.any().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Client-side state management
    const state = (ctx as any).state || new Map();
    
    switch (input.action) {
      case 'get':
        return state.get(input.key);
      case 'set':
        state.set(input.key, input.value);
        return { success: true };
      case 'update':
        const current = state.get(input.key) || {};
        state.set(input.key, { ...current, ...input.value });
        return { success: true };
      default:
        return null;
    }
  });

// Navigation tool
export const navigationTool = aui
  .tool('navigate')
  .input(z.object({
    url: z.string(),
    type: z.enum(['push', 'replace', 'reload']).default('push')
  }))
  .clientExecute(async ({ input }) => {
    if (typeof window === 'undefined') {
      throw new Error('Navigation only available on client');
    }
    
    switch (input.type) {
      case 'push':
        window.history.pushState({}, '', input.url);
        break;
      case 'replace':
        window.history.replaceState({}, '', input.url);
        break;
      case 'reload':
        window.location.href = input.url;
        break;
    }
    
    return { success: true, url: input.url };
  });

// Form submission tool
export const formTool = aui
  .tool('form')
  .input(z.object({
    formId: z.string().optional(),
    data: z.record(z.any()),
    endpoint: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side form processing
    return {
      success: true,
      data: input.data,
      timestamp: new Date().toISOString()
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const endpoint = input.endpoint || '/api/tools/form';
    return ctx.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.data)
    }).then(r => r.json());
  });

// WebSocket communication tool
export const websocketTool = aui
  .tool('websocket')
  .input(z.object({
    action: z.enum(['connect', 'send', 'close']),
    url: z.string().optional(),
    message: z.any().optional()
  }))
  .clientExecute(async ({ input }) => {
    // Client-only WebSocket operations
    const wsMap = (globalThis as any).__wsConnections || new Map();
    
    switch (input.action) {
      case 'connect':
        if (!input.url) throw new Error('URL required for connect');
        const ws = new WebSocket(input.url);
        wsMap.set(input.url, ws);
        return { connected: true, url: input.url };
        
      case 'send':
        if (!input.url) throw new Error('URL required for send');
        const connection = wsMap.get(input.url);
        if (!connection) throw new Error('No connection found');
        connection.send(JSON.stringify(input.message));
        return { sent: true };
        
      case 'close':
        if (!input.url) throw new Error('URL required for close');
        const conn = wsMap.get(input.url);
        if (conn) {
          conn.close();
          wsMap.delete(input.url);
        }
        return { closed: true };
    }
  });

// Email sending tool
export const emailTool = aui
  .tool('email')
  .input(z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
    html: z.boolean().optional()
  }))
  .execute(async ({ input }) => {
    // Server-only email sending
    console.log('Sending email:', input);
    return {
      success: true,
      messageId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
  });

// Cache management tool
export const cacheTool = aui
  .tool('cache')
  .input(z.object({
    action: z.enum(['get', 'set', 'delete', 'clear']),
    key: z.string().optional(),
    value: z.any().optional(),
    ttl: z.number().optional()
  }))
  .execute(async ({ input, ctx }) => {
    const cache = ctx?.cache || new Map();
    
    switch (input.action) {
      case 'get':
        return cache.get(input.key);
      case 'set':
        cache.set(input.key, input.value);
        return { success: true };
      case 'delete':
        return { success: cache.delete(input.key) };
      case 'clear':
        cache.clear();
        return { success: true };
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Use browser cache APIs when available
    if ('caches' in globalThis) {
      const cache = await caches.open('aui-cache');
      
      switch (input.action) {
        case 'get':
          const response = await cache.match(input.key!);
          return response ? await response.json() : null;
        case 'set':
          await cache.put(input.key!, new Response(JSON.stringify(input.value)));
          return { success: true };
        case 'delete':
          return { success: await cache.delete(input.key!) };
        case 'clear':
          // Clear all cache entries
          return { success: true };
      }
    }
    
    // Fallback to context cache
    return ctx.cache;
  });

// Export all tools for easy import
export const aiControlTools = {
  database: databaseTool,
  filesystem: fileSystemTool,
  apiRequest: apiRequestTool,
  dom: domTool,
  state: stateTool,
  navigation: navigationTool,
  form: formTool,
  websocket: websocketTool,
  email: emailTool,
  cache: cacheTool
};

export default aiControlTools;