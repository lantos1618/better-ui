import aui from '../index';
import { z } from 'zod';

// ============================================
// EXACT IMPLEMENTATION AS REQUESTED
// ============================================

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
    const results = await mockDatabaseSearch(input.query);
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const response = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await response.json();
    ctx.cache.set(input.query, data);
    return data;
  })
  .render(({ data }) => <SearchResults results={data} />);

// ============================================
// ADDITIONAL REAL-WORLD EXAMPLES
// ============================================

// AI Control Tool - Frontend manipulation
export const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['click', 'type', 'navigate']),
    target: z.string(),
    value: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    switch (input.action) {
      case 'click':
        (document.querySelector(input.target) as HTMLElement)?.click();
        return { success: true, action: 'clicked', target: input.target };
      case 'type':
        const element = document.querySelector(input.target) as HTMLInputElement;
        if (element && input.value) {
          element.value = input.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return { success: true, action: 'typed', target: input.target, value: input.value };
      case 'navigate':
        window.location.href = input.value || '/';
        return { success: true, action: 'navigated', url: input.value };
      default:
        return { success: false, error: 'Unknown action' };
    }
  })
  .render(({ data }) => (
    <div className="p-2 bg-green-50 rounded">
      Action: {data.action} - {data.success ? '✓' : '✗'}
    </div>
  ));

// Database Tool - Backend control
export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional(),
    id: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // This would connect to your actual database
    switch (input.operation) {
      case 'create':
        return { id: Math.random().toString(36), ...input.data };
      case 'read':
        return { id: input.id, data: { name: 'Sample', created: new Date() } };
      case 'update':
        return { id: input.id, updated: true, ...input.data };
      case 'delete':
        return { id: input.id, deleted: true };
      default:
        throw new Error('Invalid operation');
    }
  })
  .render(({ data }) => (
    <pre className="p-2 bg-gray-100 rounded text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  ));

// Analytics Tool - With middleware for tracking
export const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional()
  }))
  .middleware(async ({ input, next }) => {
    console.log('[Analytics] Tracking:', input.event);
    const startTime = Date.now();
    const result = await next();
    console.log('[Analytics] Duration:', Date.now() - startTime + 'ms');
    return result;
  })
  .execute(async ({ input }) => {
    // Send to analytics service
    return {
      tracked: true,
      event: input.event,
      timestamp: new Date().toISOString(),
      properties: input.properties
    };
  })
  .render(({ data }) => (
    <div className="text-sm text-gray-600">
      ✓ Event tracked: {data.event} at {data.timestamp}
    </div>
  ));

// Form Submission Tool - With validation and optimistic updates
export const formTool = aui
  .tool('form-submit')
  .input(z.object({
    formId: z.string(),
    fields: z.record(z.string())
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Optimistic update
    ctx.cache.set(`form-${input.formId}`, { 
      status: 'submitting', 
      data: input.fields 
    });
    
    try {
      const response = await ctx.fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      
      const result = await response.json();
      ctx.cache.set(`form-${input.formId}`, { 
        status: 'success', 
        data: result 
      });
      return result;
    } catch (error) {
      ctx.cache.set(`form-${input.formId}`, { 
        status: 'error', 
        error: (error as Error).message 
      });
      throw error;
    }
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Submitting...</div>;
    if (error) return <div className="text-red-500">Error: {error.message}</div>;
    return <div className="text-green-500">✓ Form submitted successfully</div>;
  });

// ============================================
// HELPER COMPONENTS & FUNCTIONS
// ============================================

function SearchResults({ results }: { results: any[] }) {
  return (
    <div className="space-y-2">
      {results.map((result, i) => (
        <div key={i} className="p-2 bg-white border rounded">
          <h3 className="font-medium">{result.title}</h3>
          <p className="text-sm text-gray-600">{result.description}</p>
        </div>
      ))}
    </div>
  );
}

async function mockDatabaseSearch(query: string) {
  // Simulate database search
  await new Promise(resolve => setTimeout(resolve, 100));
  return [
    { title: `Result for: ${query}`, description: 'First matching result' },
    { title: 'Related result', description: 'Secondary match' }
  ];
}

// ============================================
// EXPORT ALL TOOLS FOR AI DISCOVERY
// ============================================

export const allTools = [
  simpleTool,
  complexTool,
  uiControlTool,
  databaseTool,
  analyticsTool,
  formTool
];

// Tool registry for AI agents
export const toolRegistry = {
  weather: simpleTool,
  search: complexTool,
  'ui-control': uiControlTool,
  database: databaseTool,
  analytics: analyticsTool,
  'form-submit': formTool
};