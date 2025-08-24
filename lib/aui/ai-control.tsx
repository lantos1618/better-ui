import React from 'react';
import aui, { z } from './index';
import type { AIControl } from './types/enhanced';

// ========================================
// AI CONTROL TOOLS FOR FRONTEND & BACKEND
// ========================================

// Frontend UI Control Tool
export const uiControlTool = aui
  .tool('ai-ui-control')
  .input(z.object({
    action: z.enum([
      'theme', 'navigate', 'modal', 'toast', 'state',
      'class', 'scroll', 'focus', 'click', 'type'
    ]),
    target: z.string().optional(),
    value: z.any().optional(),
    options: z.record(z.any()).optional(),
  }))
  .clientExecute(async ({ input, ctx }) => {
    const { action, target, value, options } = input;
    
    switch (action) {
      case 'theme':
        document.documentElement.dataset.theme = value;
        return { success: true, action: 'theme-changed', value };
      
      case 'navigate':
        ctx.router.push(value);
        return { success: true, action: 'navigated', path: value };
      
      case 'modal':
        if (value === 'close') {
          ctx.modal.close(target!);
        } else {
          ctx.modal.open(target!, options);
        }
        return { success: true, action: 'modal-updated', id: target };
      
      case 'toast':
        const type = options?.type || 'info';
        ctx.toast[type](value);
        return { success: true, action: 'toast-shown', message: value };
      
      case 'state':
        ctx.state.set(target!, value);
        return { success: true, action: 'state-updated', key: target };
      
      case 'class':
        const element = document.querySelector(target!);
        if (element) {
          if (options?.toggle) {
            element.classList.toggle(value);
          } else if (options?.remove) {
            element.classList.remove(value);
          } else {
            element.classList.add(value);
          }
        }
        return { success: true, action: 'class-modified', selector: target };
      
      case 'scroll':
        document.querySelector(target!)?.scrollIntoView(options || { behavior: 'smooth' });
        return { success: true, action: 'scrolled', target };
      
      case 'focus':
        (document.querySelector(target!) as HTMLElement)?.focus();
        return { success: true, action: 'focused', target };
      
      case 'click':
        (document.querySelector(target!) as HTMLElement)?.click();
        return { success: true, action: 'clicked', target };
      
      case 'type':
        const input = document.querySelector(target!) as HTMLInputElement;
        if (input) {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return { success: true, action: 'typed', target, value };
      
      default:
        return { success: false, error: 'Unknown action' };
    }
  })
  .render(({ data }) => (
    <div className="ai-control-result">
      {data.success ? (
        <span className="success">✓ {data.action}</span>
      ) : (
        <span className="error">✗ {data.error}</span>
      )}
    </div>
  ))
  .build();

// Backend Database Control Tool
export const dbControlTool = aui
  .tool('ai-db-control')
  .input(z.object({
    operation: z.enum(['query', 'insert', 'update', 'delete', 'transaction']),
    table: z.string().optional(),
    data: z.any().optional(),
    where: z.record(z.any()).optional(),
    sql: z.string().optional(),
    params: z.array(z.any()).optional(),
  }))
  .serverOnly()
  .execute(async ({ input }) => {
    // This runs only on the server with full database access
    const { operation, table, data, where, sql, params } = input;
    
    // Mock implementation - replace with actual database operations
    switch (operation) {
      case 'query':
        console.log('Executing query:', sql, params);
        return { 
          success: true, 
          rows: [], 
          rowCount: 0 
        };
      
      case 'insert':
        console.log('Inserting into', table, data);
        return { 
          success: true, 
          id: Math.random().toString(36).substr(2, 9),
          affected: 1 
        };
      
      case 'update':
        console.log('Updating', table, 'set', data, 'where', where);
        return { 
          success: true, 
          affected: 1 
        };
      
      case 'delete':
        console.log('Deleting from', table, 'where', where);
        return { 
          success: true, 
          affected: 1 
        };
      
      case 'transaction':
        console.log('Running transaction');
        return { 
          success: true, 
          committed: true 
        };
      
      default:
        return { 
          success: false, 
          error: 'Unknown operation' 
        };
    }
  })
  .render(({ data }) => (
    <div className="db-result">
      {data.success ? (
        <span className="success">Database operation completed</span>
      ) : (
        <span className="error">Database error: {data.error}</span>
      )}
    </div>
  ))
  .build();

// File System Control Tool
export const fsControlTool = aui
  .tool('ai-fs-control')
  .input(z.object({
    operation: z.enum(['read', 'write', 'delete', 'exists', 'list']),
    path: z.string(),
    content: z.string().optional(),
  }))
  .serverOnly()
  .execute(async ({ input }) => {
    const { operation, path, content } = input;
    
    // Mock implementation - replace with actual fs operations
    switch (operation) {
      case 'read':
        console.log('Reading file:', path);
        return { success: true, content: 'File content here' };
      
      case 'write':
        console.log('Writing file:', path, content);
        return { success: true, written: content?.length || 0 };
      
      case 'delete':
        console.log('Deleting file:', path);
        return { success: true, deleted: true };
      
      case 'exists':
        console.log('Checking existence:', path);
        return { success: true, exists: true };
      
      case 'list':
        console.log('Listing directory:', path);
        return { success: true, files: [] };
      
      default:
        return { success: false, error: 'Unknown operation' };
    }
  })
  .render(({ data }) => (
    <div className="fs-result">
      {data.success ? '✓ File operation completed' : `✗ ${data.error}`}
    </div>
  ))
  .build();

// API Control Tool
export const apiControlTool = aui
  .tool('ai-api-control')
  .input(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
    body: z.any().optional(),
    headers: z.record(z.string()).optional(),
    stream: z.boolean().default(false),
  }))
  .clientExecute(async ({ input, ctx }) => {
    const { endpoint, method, body, headers, stream } = input;
    
    if (stream) {
      // Handle streaming responses
      const streamResponse = ctx.stream(endpoint, { method, body, headers });
      const chunks: any[] = [];
      
      for await (const chunk of streamResponse) {
        chunks.push(chunk);
        ctx.update(chunks); // Real-time updates
      }
      
      return { success: true, data: chunks, streamed: true };
    } else {
      // Regular API call
      const response = await ctx.fetch(endpoint, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
      
      return { success: true, data: response, streamed: false };
    }
  })
  .render(({ data }) => (
    <div className="api-result">
      <div>API call {data.success ? 'succeeded' : 'failed'}</div>
      {data.streamed && <div>Streamed {data.data.length} chunks</div>}
    </div>
  ))
  .build();

// Process Control Tool (Server-only)
export const processControlTool = aui
  .tool('ai-process-control')
  .input(z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    operation: z.enum(['exec', 'spawn', 'kill']).default('exec'),
    pid: z.number().optional(),
  }))
  .serverOnly()
  .execute(async ({ input }) => {
    const { command, args, operation, pid } = input;
    
    // Mock implementation - replace with actual process operations
    switch (operation) {
      case 'exec':
        console.log('Executing:', command, args);
        return { success: true, output: 'Command output', exitCode: 0 };
      
      case 'spawn':
        console.log('Spawning:', command, args);
        return { success: true, pid: Math.floor(Math.random() * 10000) };
      
      case 'kill':
        console.log('Killing process:', pid);
        return { success: true, killed: true };
      
      default:
        return { success: false, error: 'Unknown operation' };
    }
  })
  .render(({ data }) => (
    <div className="process-result">
      {data.success ? '✓ Process operation completed' : `✗ ${data.error}`}
    </div>
  ))
  .build();

// Composite AI Control Tool - Combines all capabilities
export const aiControlTool = aui
  .tool('ai-control')
  .input(z.object({
    domain: z.enum(['ui', 'db', 'fs', 'api', 'process']),
    action: z.string(),
    params: z.any(),
  }))
  .execute(async ({ input, ctx }) => {
    const { domain, action, params } = input;
    
    // Route to appropriate control tool
    switch (domain) {
      case 'ui':
        return await uiControlTool.execute({ 
          input: { action, ...params }, 
          ctx 
        });
      
      case 'db':
        return await dbControlTool.execute({ 
          input: { operation: action, ...params } 
        });
      
      case 'fs':
        return await fsControlTool.execute({ 
          input: { operation: action, ...params } 
        });
      
      case 'api':
        return await apiControlTool.execute({ 
          input: { endpoint: params.endpoint, ...params }, 
          ctx 
        });
      
      case 'process':
        return await processControlTool.execute({ 
          input: { command: params.command, operation: action, ...params } 
        });
      
      default:
        return { success: false, error: 'Unknown domain' };
    }
  })
  .render(({ data }) => (
    <div className="ai-control">
      <h3>AI Control Result</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ))
  .build();

// Register all AI control tools
[
  uiControlTool,
  dbControlTool,
  fsControlTool,
  apiControlTool,
  processControlTool,
  aiControlTool,
].forEach(tool => aui.register(tool));

// Export for use
export const aiControl = {
  ui: uiControlTool,
  db: dbControlTool,
  fs: fsControlTool,
  api: apiControlTool,
  process: processControlTool,
  unified: aiControlTool,
};

// Helper function for AI to easily control frontend/backend
export function createAIController(): AIControl {
  return {
    ui: {
      setTheme: (theme) => uiControlTool.execute({ 
        input: { action: 'theme', value: theme } 
      }),
      navigate: (path) => uiControlTool.execute({ 
        input: { action: 'navigate', value: path } 
      }),
      openModal: (id, props) => uiControlTool.execute({ 
        input: { action: 'modal', target: id, options: props } 
      }),
      closeModal: (id) => uiControlTool.execute({ 
        input: { action: 'modal', target: id, value: 'close' } 
      }),
      showToast: (message, type) => uiControlTool.execute({ 
        input: { action: 'toast', value: message, options: { type } } 
      }),
      updateState: (key, value) => uiControlTool.execute({ 
        input: { action: 'state', target: key, value } 
      }),
      addClass: (selector, className) => uiControlTool.execute({ 
        input: { action: 'class', target: selector, value: className } 
      }),
      removeClass: (selector, className) => uiControlTool.execute({ 
        input: { action: 'class', target: selector, value: className, options: { remove: true } } 
      }),
      toggleClass: (selector, className) => uiControlTool.execute({ 
        input: { action: 'class', target: selector, value: className, options: { toggle: true } } 
      }),
      scrollTo: (selector, options) => uiControlTool.execute({ 
        input: { action: 'scroll', target: selector, options } 
      }),
      focus: (selector) => uiControlTool.execute({ 
        input: { action: 'focus', target: selector } 
      }),
      click: (selector) => uiControlTool.execute({ 
        input: { action: 'click', target: selector } 
      }),
      type: (selector, text) => uiControlTool.execute({ 
        input: { action: 'type', target: selector, value: text } 
      }),
    },
    
    db: {
      query: async (sql, params) => {
        const result = await dbControlTool.execute({ 
          input: { operation: 'query', sql, params } 
        });
        return result.rows || [];
      },
      insert: async (table, data) => dbControlTool.execute({ 
        input: { operation: 'insert', table, data } 
      }),
      update: async (table, data, where) => dbControlTool.execute({ 
        input: { operation: 'update', table, data, where } 
      }),
      delete: async (table, where) => dbControlTool.execute({ 
        input: { operation: 'delete', table, where } 
      }),
      transaction: async (fn) => {
        await dbControlTool.execute({ 
          input: { operation: 'transaction' } 
        });
        return fn();
      },
    },
    
    fs: {
      read: async (path) => {
        const result = await fsControlTool.execute({ 
          input: { operation: 'read', path } 
        });
        return result.content || '';
      },
      write: async (path, content) => {
        await fsControlTool.execute({ 
          input: { operation: 'write', path, content } 
        });
      },
      delete: async (path) => {
        await fsControlTool.execute({ 
          input: { operation: 'delete', path } 
        });
      },
      exists: async (path) => {
        const result = await fsControlTool.execute({ 
          input: { operation: 'exists', path } 
        });
        return result.exists || false;
      },
      list: async (path) => {
        const result = await fsControlTool.execute({ 
          input: { operation: 'list', path } 
        });
        return result.files || [];
      },
    },
    
    process: {
      exec: async (command) => {
        const result = await processControlTool.execute({ 
          input: { command, operation: 'exec' } 
        });
        return result.output || '';
      },
      spawn: async (command, args) => {
        await processControlTool.execute({ 
          input: { command, args, operation: 'spawn' } 
        });
      },
      kill: async (pid) => {
        await processControlTool.execute({ 
          input: { operation: 'kill', pid } 
        });
      },
    },
    
    api: {
      call: async (endpoint, options) => {
        const result = await apiControlTool.execute({ 
          input: { endpoint, ...options } 
        });
        return result.data;
      },
      stream: async function* (endpoint, options) {
        const result = await apiControlTool.execute({ 
          input: { endpoint, ...options, stream: true } 
        });
        for (const chunk of result.data || []) {
          yield chunk;
        }
      },
      websocket: (url) => new WebSocket(url),
    },
  };
}