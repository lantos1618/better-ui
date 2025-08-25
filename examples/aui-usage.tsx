/**
 * AUI (Assistant-UI) System Examples
 * Clean, concise API for AI-controlled tools in Next.js/Vercel
 */

import React from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// ============================================
// SIMPLE TOOL - Just 2 methods (input + execute + render)
// ============================================
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// ============================================
// COMPLEX TOOL - Adds client-side optimization
// ============================================
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    // In production: return await db.search(input.query)
    return [
      { id: 1, title: `Result for ${input.query}` },
      { id: 2, title: `Another result` }
    ];
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side optimization with caching
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div>
      {data.map((item: any) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  ));

// ============================================
// AI CONTROL TOOLS - Enable AI to control frontend/backend
// ============================================

// Frontend UI Control
const uiControl = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'addClass', 'setText']),
    selector: z.string(),
    value: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const el = document.querySelector(input.selector) as HTMLElement;
    if (!el) throw new Error(`Element not found: ${input.selector}`);
    
    switch (input.action) {
      case 'show': el.style.display = 'block'; break;
      case 'hide': el.style.display = 'none'; break;
      case 'addClass': el.classList.add(input.value!); break;
      case 'setText': el.textContent = input.value!; break;
    }
    
    return { success: true, action: input.action };
  })
  .render(({ data }) => <div>✓ {data.action} completed</div>);

// Backend Database Control
const dbControl = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['find', 'create', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side database operations
    switch (input.operation) {
      case 'find':
        // return await db.from(input.table).select()
        return { rows: [], count: 0 };
      case 'create':
        // return await db.from(input.table).insert(input.data)
        return { id: 'new-id', ...input.data };
      case 'update':
        // return await db.from(input.table).update(input.data)
        return { updated: true };
      case 'delete':
        // return await db.from(input.table).delete()
        return { deleted: true };
    }
  })
  .render(({ data }) => (
    <pre>{JSON.stringify(data, null, 2)}</pre>
  ));

// Backend API Control
const apiControl = aui
  .tool('api-call')
  .input(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    body: z.any().optional(),
    headers: z.record(z.string()).optional()
  }))
  .execute(async ({ input, ctx }) => {
    const response = await ctx!.fetch(input.endpoint, {
      method: input.method,
      headers: input.headers,
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    return response.json();
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      Response: {JSON.stringify(data)}
    </div>
  ));

// ============================================
// USAGE EXAMPLES
// ============================================

// 1. Direct execution
async function directUsage() {
  const result = await simpleTool.run({ city: 'New York' });
  console.log(result); // { temp: 72, city: 'New York' }
}

// 2. In React component with hook
import { useAUITool } from '@/lib/aui';

function WeatherWidget() {
  const { data, loading, error, execute } = useAUITool(simpleTool);
  
  React.useEffect(() => {
    execute({ city: 'Paris' });
  }, [execute]);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (data && simpleTool.renderer) {
    return simpleTool.renderer({ data });
  }
  return null;
}

// 3. AI Assistant can call these tools
const aiPrompt = `
  Available tools:
  - weather: Get weather for a city
  - search: Search the database
  - ui-control: Control UI elements
  - database: Perform database operations
  - api-call: Make API calls
  
  User: Hide the sidebar and get weather for Tokyo
  
  Assistant: I'll help you with that.
  @ui-control{"action":"hide","selector":"#sidebar"}
  @weather{"city":"Tokyo"}
`;

// 4. Batch execution
async function batchExecution() {
  const tools = [
    { tool: 'weather', input: { city: 'London' } },
    { tool: 'weather', input: { city: 'Paris' } },
    { tool: 'search', input: { query: 'typescript' } }
  ];
  
  const results = await Promise.all(
    tools.map(({ tool, input }) => aui.execute(tool, input))
  );
  
  return results;
}

// Export for use
export {
  simpleTool,
  complexTool,
  uiControl,
  dbControl,
  apiControl,
  directUsage,
  WeatherWidget,
  batchExecution
};