/**
 * AUI (Assistant-UI) System - AI Control Examples
 * 
 * Demonstrates how AI can control both frontend and backend
 * in Next.js/Vercel applications using a concise, elegant API.
 */

import React from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// ============================================
// SIMPLE TOOLS - Just 2 methods (input + execute)
// ============================================

// Weather tool - minimal server-side execution
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// User info tool - fetch user data
const userTool = aui
  .tool('user')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => ({ 
    id: input.userId, 
    name: 'John Doe',
    email: 'john@example.com'
  }));

// ============================================
// COMPLEX TOOLS - With client optimization
// ============================================

// Search with caching and client execution
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server: Direct database access
    // Mock database search - replace with actual implementation
    return [
      { id: 1, title: `Result for "${input.query}"`, score: 0.95 },
      { id: 2, title: `Another match for "${input.query}"`, score: 0.85 },
    ];
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client: Check cache first, then fetch
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.map((result: any) => (
        <div key={result.id} className="p-2 bg-gray-100 rounded">
          {result.title} (score: {result.score})
        </div>
      ))}
    </div>
  ));

// ============================================
// AI FRONTEND CONTROL - Manipulate UI
// ============================================

const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'toggle', 'addClass', 'removeClass']),
    selector: z.string(),
    className: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const elements = document.querySelectorAll(input.selector);
    
    elements.forEach(el => {
      const element = el as HTMLElement;
      switch (input.action) {
        case 'show':
          element.style.display = '';
          break;
        case 'hide':
          element.style.display = 'none';
          break;
        case 'toggle':
          element.style.display = element.style.display === 'none' ? '' : 'none';
          break;
        case 'addClass':
          if (input.className) element.classList.add(input.className);
          break;
        case 'removeClass':
          if (input.className) element.classList.remove(input.className);
          break;
      }
    });
    
    return { 
      success: true, 
      affected: elements.length,
      action: input.action 
    };
  });

// ============================================
// AI BACKEND CONTROL - Database operations
// ============================================

const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    collection: z.string(),
    query: z.any().optional(),
    data: z.any().optional()
  }))
  .execute(async ({ input, ctx }) => {
    // This runs on the server with full database access
    // Mock database - replace with actual implementation
    const db = {
      collection: (name: string) => ({
        insert: async (data: any) => ({ id: '1', ...data }),
        find: async (query: any) => [{ id: '1', ...query }],
        update: async (query: any, data: any) => ({ modified: 1 }),
        delete: async (query: any) => ({ deleted: 1 })
      })
    };
    
    switch (input.operation) {
      case 'create':
        return await db.collection(input.collection).insert(input.data);
      case 'read':
        return await db.collection(input.collection).find(input.query);
      case 'update':
        return await db.collection(input.collection).update(input.query, input.data);
      case 'delete':
        return await db.collection(input.collection).delete(input.query);
    }
  })
  .middleware(async ({ input, ctx, next }) => {
    // Add authentication check
    if (!ctx.user) throw new Error('Authentication required');
    // Add authorization check
    if (!ctx.user.permissions.includes(input.operation)) {
      throw new Error(`Permission denied for ${input.operation}`);
    }
    return next();
  });

// ============================================
// AI API CONTROL - Make external API calls
// ============================================

const apiTool = aui
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
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: Route through proxy to avoid CORS
    return ctx.fetch('/api/tools/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
  });

// ============================================
// AI FORM GENERATION - Create dynamic forms
// ============================================

const formTool = aui
  .tool('generate-form')
  .input(z.object({
    title: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'email', 'number', 'date', 'select', 'checkbox']),
      label: z.string(),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(),
      validation: z.string().optional()
    })),
    submitUrl: z.string().optional()
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => (
    <form className="space-y-4 p-4 border rounded">
      <h2 className="text-xl font-bold">{data.title}</h2>
      {data.fields.map(field => (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.type === 'select' ? (
            <select name={field.name} required={field.required} className="w-full p-2 border rounded">
              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : field.type === 'checkbox' ? (
            <input type="checkbox" name={field.name} className="mr-2" />
          ) : (
            <input
              type={field.type}
              name={field.name}
              required={field.required}
              className="w-full p-2 border rounded"
            />
          )}
        </div>
      ))}
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Submit
      </button>
    </form>
  ));

// ============================================
// AI ANALYTICS - Track and analyze events
// ============================================

const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional(),
    userId: z.string().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Track on client
    // Mock analytics - replace with actual implementation
    if ((window as any).analytics) {
      (window as any).analytics.track(input.event, input.properties);
    }
    
    // Also send to server
    return ctx.fetch('/api/tools/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        timestamp: new Date().toISOString(),
        sessionId: ctx.session?.id
      })
    }).then(r => r.json());
  })
  .execute(async ({ input }) => {
    // Server-side: Store in database
    // Mock analytics storage - replace with actual implementation
    console.log('Analytics event stored:', input);
    return { tracked: true, event: input.event };
  });

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: AI executes a simple tool
async function aiExecutesSimpleTool() {
  const result = await weatherTool.run({ city: 'San Francisco' });
  console.log(result); // { temp: 72, city: 'San Francisco' }
}

// Example 2: AI controls the UI
async function aiControlsUI() {
  await uiControlTool.run({
    action: 'addClass',
    selector: '.sidebar',
    className: 'collapsed'
  });
}

// Example 3: AI performs database operations
async function aiPerformsDatabase() {
  const user = await databaseTool.run({
    operation: 'create',
    collection: 'users',
    data: { name: 'Alice', email: 'alice@example.com' }
  }, {
    user: { id: 'ai-agent', permissions: ['create', 'read'] },
    cache: new Map(),
    fetch: globalThis.fetch
  });
}

// Example 4: AI generates and renders a form
function AIGeneratedForm() {
  const [formData, setFormData] = React.useState<any>(null);
  
  React.useEffect(() => {
    // AI decides what form to create
    formTool.run({
      title: 'User Registration',
      fields: [
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'password', type: 'text', label: 'Password', required: true },
        { name: 'role', type: 'select', label: 'Role', options: ['user', 'admin'] }
      ]
    }).then(data => setFormData(data));
  }, []);
  
  if (!formData) return <div>Loading...</div>;
  
  const FormComponent = formTool.renderer;
  return FormComponent ? <FormComponent data={formData} /> : null;
}

// ============================================
// EXPORT ALL TOOLS FOR AI DISCOVERY
// ============================================

export const aiTools = {
  weather: weatherTool,
  user: userTool,
  search: searchTool,
  uiControl: uiControlTool,
  database: databaseTool,
  api: apiTool,
  form: formTool,
  analytics: analyticsTool
};

// Helper function for AI to discover available tools
export function discoverTools() {
  return Object.entries(aiTools).map(([name, tool]) => ({
    name,
    description: tool.description,
    hasInput: !!tool.schema,
    hasRender: !!tool.renderer
  }));
}

// Helper for AI to execute any tool by name
export async function executeToolByName(
  toolName: string,
  input: any,
  context?: any
) {
  const tool = (aiTools as any)[toolName];
  if (!tool) throw new Error(`Tool ${toolName} not found`);
  return tool.run(input, context);
}

export default aiTools;