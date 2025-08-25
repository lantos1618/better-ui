'use client';

import { z } from 'zod';
import aui from '../index';

// Simple tool - just 2 methods (minimum required)
export const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
export const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    return mockSearch(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
  })
  .render(({ data }) => <SearchResults results={data} />);

// Database tool - AI can query your database
export const databaseTool = aui
  .tool('database')
  .input(z.object({
    table: z.enum(['users', 'posts', 'comments']),
    action: z.enum(['list', 'get', 'create', 'update', 'delete']),
    data: z.any().optional(),
    id: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // AI can safely interact with your database
    switch (input.action) {
      case 'list':
        return { items: await mockDb.list(input.table) };
      case 'get':
        return await mockDb.get(input.table, input.id!);
      case 'create':
        return await mockDb.create(input.table, input.data);
      case 'update':
        return await mockDb.update(input.table, input.id!, input.data);
      case 'delete':
        return await mockDb.delete(input.table, input.id!);
    }
  })
  .render(({ data }) => (
    <div className="font-mono text-sm p-2 bg-gray-100 rounded">
      {JSON.stringify(data, null, 2)}
    </div>
  ));

// UI Control tool - AI can manipulate the UI
export const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show-modal', 'hide-modal', 'navigate', 'refresh', 'notify']),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // AI controls UI state
    switch (input.action) {
      case 'show-modal':
        return { type: 'modal', visible: true, ...input.data };
      case 'navigate':
        return { type: 'navigation', path: input.data.path };
      case 'notify':
        return { type: 'notification', message: input.data.message };
      default:
        return { type: input.action, data: input.data };
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side UI updates
    if (input.action === 'navigate' && typeof window !== 'undefined') {
      window.location.href = input.data.path;
    }
    return { executed: true, action: input.action };
  })
  .render(({ data }) => {
    if (data.type === 'modal') {
      return <Modal {...data} />;
    }
    if (data.type === 'notification') {
      return <Notification message={data.message} />;
    }
    return null;
  });

// File system tool - AI can read/write files
export const fileSystemTool = aui
  .tool('filesystem')
  .input(z.object({
    action: z.enum(['read', 'write', 'list', 'delete']),
    path: z.string(),
    content: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Server-only file operations
    switch (input.action) {
      case 'read':
        return { content: await mockFs.read(input.path) };
      case 'write':
        return { success: await mockFs.write(input.path, input.content!) };
      case 'list':
        return { files: await mockFs.list(input.path) };
      case 'delete':
        return { success: await mockFs.delete(input.path) };
    }
  })
  .render(({ data }) => (
    <pre className="p-2 bg-black text-green-400 rounded overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  ));

// API Integration tool - AI can call external APIs
export const apiTool = aui
  .tool('api-call')
  .input(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    headers: z.record(z.string()).optional(),
    body: z.any().optional()
  }))
  .execute(async ({ input, ctx }) => {
    const response = await ctx!.fetch(input.endpoint, {
      method: input.method,
      headers: input.headers,
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    return await response.json();
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Calling API...</div>;
    if (error) return <div className="text-red-500">API Error: {error.message}</div>;
    return (
      <div className="p-2 bg-gray-50 rounded">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  });

// Email tool - AI can send emails
export const emailTool = aui
  .tool('email')
  .input(z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
    cc: z.array(z.string().email()).optional()
  }))
  .execute(async ({ input }) => {
    // Send email via your email service
    console.log('Sending email:', input);
    return { sent: true, messageId: `msg-${Date.now()}` };
  })
  .render(({ data }) => (
    <div className="p-3 bg-green-50 text-green-800 rounded">
      ✓ Email sent (ID: {data.messageId})
    </div>
  ));

// Chart/Visualization tool - AI can create charts
export const chartTool = aui
  .tool('chart')
  .input(z.object({
    type: z.enum(['line', 'bar', 'pie', 'scatter']),
    data: z.array(z.object({
      label: z.string(),
      value: z.number()
    }))
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => (
    <div className="p-4 bg-white border rounded">
      <div className="font-semibold mb-2">{data.type.toUpperCase()} Chart</div>
      <div className="space-y-1">
        {data.data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm w-20">{item.label}:</span>
            <div 
              className="bg-blue-500 h-4 rounded"
              style={{ width: `${(item.value / Math.max(...data.data.map(d => d.value))) * 200}px` }}
            />
            <span className="text-sm">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  ));

// Components used by tools
function SearchResults({ results }: { results: any[] }) {
  return (
    <div className="space-y-2">
      {results?.map((item, i) => (
        <div key={i} className="p-2 bg-white border rounded">
          <div className="font-semibold">{item.title}</div>
          <div className="text-sm text-gray-600">{item.description}</div>
        </div>
      ))}
    </div>
  );
}

function Modal({ visible, title, content }: any) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p>{content}</p>
      </div>
    </div>
  );
}

function Notification({ message }: { message: string }) {
  return (
    <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg">
      {message}
    </div>
  );
}

// Mock implementations
async function mockSearch(query: string) {
  await new Promise(r => setTimeout(r, 100));
  return [
    { title: `Result for ${query}`, description: 'Found this result' },
    { title: `Another ${query} match`, description: 'Also relevant' }
  ];
}

const mockDb = {
  list: async (table: string) => [{ id: '1', name: `${table} item` }],
  get: async (table: string, id: string) => ({ id, table, data: 'mock data' }),
  create: async (table: string, data: any) => ({ id: Date.now().toString(), ...data }),
  update: async (table: string, id: string, data: any) => ({ id, ...data }),
  delete: async (table: string, id: string) => ({ deleted: true, id })
};

const mockFs = {
  read: async (path: string) => `Contents of ${path}`,
  write: async (path: string, content: string) => true,
  list: async (path: string) => ['file1.txt', 'file2.js'],
  delete: async (path: string) => true
};