import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    // In real app, this would be: db.search(input.query)
    return [
      { id: 1, title: `Result for ${input.query}` },
      { id: 2, title: `Another result for ${input.query}` }
    ];
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
  .render(({ data }) => (
    <div className="space-y-2">
      <h3 className="font-semibold">Search Results:</h3>
      {data.map((item: any) => (
        <div key={item.id} className="p-2 border rounded">
          {item.title}
        </div>
      ))}
    </div>
  ));

// AI Control Examples - Frontend UI manipulation
const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({ 
    action: z.enum(['show', 'hide', 'toggle']),
    element: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.element);
    if (!element) throw new Error(`Element ${input.element} not found`);
    
    switch (input.action) {
      case 'show':
        (element as HTMLElement).style.display = 'block';
        break;
      case 'hide':
        (element as HTMLElement).style.display = 'none';
        break;
      case 'toggle':
        const el = element as HTMLElement;
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
        break;
    }
    
    return { success: true, action: input.action, element: input.element };
  })
  .render(({ data }) => (
    <div className="text-green-600">
      ✓ {data.action} {data.element}
    </div>
  ));

// Backend control - Database operations
const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // This would connect to your actual database
    // For demo, just return mock response
    switch (input.operation) {
      case 'create':
        return { id: Math.random(), ...input.data };
      case 'read':
        return { id: 1, name: 'Example', table: input.table };
      case 'update':
        return { success: true, updated: input.data };
      case 'delete':
        return { success: true, deleted: input.data?.id };
      default:
        throw new Error('Unknown operation');
    }
  })
  .render(({ data }) => (
    <pre className="bg-gray-100 p-2 rounded">
      {JSON.stringify(data, null, 2)}
    </pre>
  ));

// Form generation - AI can create forms dynamically
const formGeneratorTool = aui
  .tool('form-generator')
  .input(z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'email', 'select']),
      label: z.string(),
      required: z.boolean().optional(),
      options: z.array(z.string()).optional()
    }))
  }))
  .execute(async ({ input }) => input.fields)
  .render(({ data }) => (
    <form className="space-y-4">
      {data.map(field => (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.type === 'select' ? (
            <select className="w-full p-2 border rounded">
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
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

// Export all tools for use
export { 
  simpleTool, 
  complexTool, 
  uiControlTool, 
  databaseTool, 
  formGeneratorTool 
};

// Example of using tools programmatically
export async function exampleUsage() {
  // Execute a tool
  const weatherResult = await simpleTool.run({ city: 'New York' });
  console.log(weatherResult); // { temp: 72, city: 'New York' }
  
  // Execute with context
  const searchResult = await complexTool.run(
    { query: 'typescript' },
    { 
      cache: new Map(),
      fetch: globalThis.fetch,
      user: { id: 1, name: 'User' }
    }
  );
  console.log(searchResult);
}