/**
 * AI Control Example - Demonstrates how AI can control both frontend and backend
 * This file shows practical tool implementations for AI assistants
 */

import React from 'react';
import aui from '../index';
import { z } from 'zod';

// 1. Database Query Tool - AI can query data
const dbQueryTool = aui
  .tool('db-query')
  .input(z.object({ 
    table: z.string(),
    query: z.record(z.any()).optional(),
    limit: z.number().optional() 
  }))
  .execute(async ({ input }) => {
    // Server-side database query
    const response = await fetch('/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <h3 className="font-semibold">Query Results ({data.length} rows)</h3>
      <pre className="bg-gray-100 p-2 rounded overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  ));

// 2. UI State Control - AI can manipulate UI state
const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show-modal', 'hide-modal', 'navigate', 'toggle-sidebar', 'set-theme']),
    payload: z.any().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Client-side UI manipulation
    switch (input.action) {
      case 'show-modal':
        window.dispatchEvent(new CustomEvent('modal:show', { detail: input.payload }));
        break;
      case 'navigate':
        window.location.href = input.payload;
        break;
      case 'set-theme':
        document.documentElement.setAttribute('data-theme', input.payload);
        break;
    }
    return { success: true, action: input.action };
  })
  .render(({ data }) => (
    <div className="text-green-600">✓ UI action: {data.action}</div>
  ));

// 3. File System Tool - AI can read/write files (server-side)
const fileSystemTool = aui
  .tool('file-system')
  .input(z.object({
    operation: z.enum(['read', 'write', 'list', 'delete']),
    path: z.string(),
    content: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side file operations
    const response = await fetch('/api/fs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      <div className="text-gray-600">File operation complete</div>
      {data.content && (
        <pre className="mt-2 p-2 bg-gray-50 rounded">{data.content}</pre>
      )}
    </div>
  ));

// 4. API Integration Tool - AI can call external APIs
const apiCallTool = aui
  .tool('api-call')
  .input(z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
    headers: z.record(z.string()).optional(),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    const response = await fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    return {
      status: response.status,
      data: await response.json()
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Use proxy for CORS
    const proxyUrl = '/api/proxy';
    return ctx.fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">API Response (Status: {data.status})</div>
      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
        {JSON.stringify(data.data, null, 2)}
      </pre>
    </div>
  ));

// 5. Real-time Data Stream - AI can subscribe to data streams
const dataStreamTool = aui
  .tool('data-stream')
  .input(z.object({
    source: z.enum(['websocket', 'sse', 'polling']),
    endpoint: z.string(),
    filter: z.string().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    const messages: any[] = [];
    
    if (input.source === 'websocket') {
      const ws = new WebSocket(input.endpoint);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (!input.filter || data.type === input.filter) {
          messages.push(data);
          ctx.cache.set('stream-data', messages);
        }
      };
      
      // Return connection info
      return { 
        connected: true, 
        source: input.source,
        endpoint: input.endpoint 
      };
    }
    
    // For SSE and polling, return mock data
    return { 
      connected: true, 
      source: input.source,
      messages: messages 
    };
  })
  .render(({ data }) => (
    <div className="p-3 bg-blue-50 rounded">
      <div className="font-semibold text-blue-900">Data Stream Connected</div>
      <div className="text-sm text-blue-700 mt-1">
        Source: {data.source} | Endpoint: {data.endpoint}
      </div>
    </div>
  ));

// 6. Form Generation Tool - AI can create dynamic forms
const formGeneratorTool = aui
  .tool('form-generator')
  .input(z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'email', 'select', 'checkbox', 'textarea']),
      label: z.string(),
      required: z.boolean().optional(),
      options: z.array(z.string()).optional()
    })),
    submitUrl: z.string().optional()
  }))
  .render(({ data: { fields, submitUrl } }) => (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      console.log('Form submitted:', Object.fromEntries(formData));
    }}>
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col">
          <label className="text-sm font-medium mb-1">{field.label}</label>
          {field.type === 'select' ? (
            <select name={field.name} required={field.required} className="border rounded px-2 py-1">
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea name={field.name} required={field.required} className="border rounded px-2 py-1" />
          ) : field.type === 'checkbox' ? (
            <input type="checkbox" name={field.name} className="w-4 h-4" />
          ) : (
            <input type={field.type} name={field.name} required={field.required} className="border rounded px-2 py-1" />
          )}
        </div>
      ))}
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Submit
      </button>
    </form>
  ));

// 7. Analytics Tool - AI can track and analyze events
const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional(),
    userId: z.string().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Track event client-side
    const event = {
      ...input,
      timestamp: Date.now(),
      sessionId: ctx.session?.id
    };
    
    // Store in cache for batching
    const events = ctx.cache.get('analytics-events') || [];
    events.push(event);
    ctx.cache.set('analytics-events', events);
    
    // Send to server if batch is large enough
    if (events.length >= 10) {
      await ctx.fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
      ctx.cache.set('analytics-events', []);
    }
    
    return { tracked: true, event: input.event };
  })
  .render(({ data }) => (
    <div className="text-green-600 text-sm">
      📊 Event tracked: {data.event}
    </div>
  ));

// Export all tools for AI to use
export const aiControlTools = {
  dbQueryTool,
  uiControlTool,
  fileSystemTool,
  apiCallTool,
  dataStreamTool,
  formGeneratorTool,
  analyticsTool
};

// Example usage for AI assistants
export const exampleAICommands = {
  // Query database
  queryUsers: () => dbQueryTool.run({ 
    table: 'users', 
    query: { active: true }, 
    limit: 10 
  }),
  
  // Control UI
  showModal: (content: any) => uiControlTool.run({ 
    action: 'show-modal', 
    payload: content 
  }),
  
  // Call external API
  fetchWeather: (city: string) => apiCallTool.run({
    url: `https://api.weather.com/v1/current?city=${city}`,
    method: 'GET'
  }),
  
  // Generate form
  createContactForm: () => formGeneratorTool.run({
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'message', type: 'textarea', label: 'Message', required: true }
    ],
    submitUrl: '/api/contact'
  }),
  
  // Track analytics
  trackEvent: (eventName: string, props?: any) => analyticsTool.run({
    event: eventName,
    properties: props
  })
};