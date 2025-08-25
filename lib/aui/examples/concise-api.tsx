import aui from '../index';
import { z } from 'zod';
import React from 'react';

// ========================================
// SIMPLE TOOLS - Just the essentials
// ========================================

// Weather tool - 2 methods only
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city,
    conditions: 'sunny'
  }))
  .render(({ data }) => <div>{data.city}: {data.temp}°F - {data.conditions}</div>);

// User profile tool  
export const profileTool = aui
  .tool('profile')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => ({
    id: input.userId,
    name: 'John Doe',
    avatar: '/avatar.jpg',
    role: 'Developer'
  }))
  .render(({ data }) => (
    <div className="flex items-center gap-3">
      <img src={data.avatar} alt={data.name} className="w-10 h-10 rounded-full" />
      <div>
        <div className="font-medium">{data.name}</div>
        <div className="text-sm text-gray-500">{data.role}</div>
      </div>
    </div>
  ));

// ========================================
// COMPLEX TOOLS - With client optimization
// ========================================

// Search with caching
export const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    filters: z.object({
      category: z.string().optional(),
      dateRange: z.tuple([z.date(), z.date()]).optional()
    }).optional()
  }))
  .execute(async ({ input }) => {
    // Server: Database search
    const results = await fetch(`/api/search?q=${input.query}`);
    return results.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client: Cache + offline support
    const cacheKey = `search:${JSON.stringify(input)}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data;
    }
    
    try {
      const response = await ctx.fetch('/api/tools/search', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      const data = await response.json();
      ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      // Offline fallback
      if (cached) return cached.data;
      throw error;
    }
  })
  .render(({ data, loading }) => (
    <div className="space-y-2">
      {loading && <div>Searching...</div>}
      {data?.results?.map((item: any) => (
        <div key={item.id} className="p-3 border rounded">
          {item.title}
        </div>
      ))}
    </div>
  ));

// ========================================
// AI CONTROL TOOLS - Frontend & Backend
// ========================================

// DOM manipulation
export const domTool = aui
  .tool('dom')
  .input(z.object({
    action: z.enum(['click', 'type', 'scroll', 'focus']),
    selector: z.string(),
    value: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    
    switch (input.action) {
      case 'click':
        (element as HTMLElement).click();
        break;
      case 'type':
        if (element instanceof HTMLInputElement) {
          element.value = input.value || '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      case 'scroll':
        element.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'focus':
        (element as HTMLElement).focus();
        break;
    }
    
    return { success: true, action: input.action };
  });

// Navigation control
export const navigationTool = aui
  .tool('navigate')
  .input(z.object({
    url: z.string().optional(),
    action: z.enum(['back', 'forward', 'reload', 'push']).optional()
  }))
  .clientExecute(async ({ input }) => {
    if (input.url) {
      window.location.href = input.url;
    } else {
      switch (input.action) {
        case 'back': window.history.back(); break;
        case 'forward': window.history.forward(); break;
        case 'reload': window.location.reload(); break;
      }
    }
    return { navigated: true };
  });

// Database operations
export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['find', 'create', 'update', 'delete']),
    collection: z.string(),
    query: z.record(z.any()).optional(),
    data: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Server-side database operations
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .render(({ data }) => (
    <pre className="p-3 bg-gray-100 rounded overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  ));

// ========================================
// MIDDLEWARE & ENHANCED TOOLS
// ========================================

// Analytics tool with middleware
export const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional()
  }))
  .middleware(async ({ input, next }) => {
    // Add timestamp
    input.properties = {
      ...input.properties,
      timestamp: Date.now(),
      sessionId: (globalThis as any).sessionId || 'anonymous'
    };
    return next();
  })
  .middleware(async ({ input, next }) => {
    // Log event
    console.log('[Analytics]', input.event, input.properties);
    return next();
  })
  .clientExecute(async ({ input }) => {
    // Send to analytics service
    if ((globalThis as any).analytics) {
      (globalThis as any).analytics.track(input.event, input.properties);
    }
    return { tracked: true, event: input.event };
  });

// ========================================
// TOOL COMPOSITION
// ========================================

// Composite tool that uses other tools
export const workflowTool = aui
  .tool('workflow')
  .input(z.object({
    steps: z.array(z.object({
      tool: z.string(),
      input: z.any()
    }))
  }))
  .execute(async ({ input }) => {
    const results = [];
    for (const step of input.steps) {
      const tool = aui.get(step.tool);
      if (tool) {
        const result = await tool.run(step.input);
        results.push({ tool: step.tool, result });
      }
    }
    return { results, completed: true };
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <div className="font-bold">Workflow completed</div>
      {data.results.map((item: any, i: number) => (
        <div key={i} className="pl-4 border-l-2">
          <span className="font-medium">{item.tool}:</span> ✓
        </div>
      ))}
    </div>
  ));

// ========================================
// EXPORT ALL TOOLS
// ========================================

export const tools = {
  weather: weatherTool,
  profile: profileTool,
  search: searchTool,
  dom: domTool,
  navigate: navigationTool,
  database: databaseTool,
  analytics: analyticsTool,
  workflow: workflowTool
};

// Type-safe tool access
export type ToolName = keyof typeof tools;
export type ToolInput<T extends ToolName> = Parameters<typeof tools[T]['run']>[0];
export type ToolOutput<T extends ToolName> = Awaited<ReturnType<typeof tools[T]['run']>>;

// Helper to get all tools
export const getAllTools = () => Object.values(tools);

// Helper to execute tool by name
export const executeTool = async <T extends ToolName>(
  name: T,
  input: ToolInput<T>
): Promise<ToolOutput<T>> => {
  const tool = tools[name];
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool.run(input as any) as Promise<ToolOutput<T>>;
};