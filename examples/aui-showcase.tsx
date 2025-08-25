import React from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods as requested
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
    // Server-side: direct database search
    return await db.search(input.query);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first, then fetch
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => <SearchResults results={data} />);

// Example usage in a component
export function AIControlledInterface() {
  const { execute, loading, data, error } = useAUITool(simpleTool);
  
  // AI can trigger this via tool calls
  const handleAICommand = async (toolName: string, input: any) => {
    const tool = aui.get(toolName);
    if (tool) {
      return await tool.run(input);
    }
  };
  
  return (
    <div>
      {/* AI can control both frontend rendering and backend execution */}
      {simpleTool.renderer && data && simpleTool.renderer({ data })}
    </div>
  );
}

// More real-world examples

// User management tool
const userTool = aui
  .tool('user-management')
  .input(z.object({
    action: z.enum(['create', 'update', 'delete']),
    userId: z.string().optional(),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    switch (input.action) {
      case 'create':
        return await createUser(input.data);
      case 'update':
        return await updateUser(input.userId!, input.data);
      case 'delete':
        return await deleteUser(input.userId!);
    }
  })
  .render(({ data }) => <UserCard user={data} />);

// Analytics dashboard tool
const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    metric: z.enum(['revenue', 'users', 'engagement']),
    timeframe: z.enum(['day', 'week', 'month', 'year'])
  }))
  .execute(async ({ input }) => {
    return await fetchAnalytics(input.metric, input.timeframe);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Cache analytics for 5 minutes
    const key = `${input.metric}-${input.timeframe}`;
    const cached = ctx.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }
    
    const data = await ctx.fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(key, { data, timestamp: Date.now() });
    return data;
  })
  .render(({ data, loading }) => (
    <div className="dashboard">
      {loading ? <Spinner /> : <Chart data={data} />}
    </div>
  ));

// File operations tool for AI control
const fileTool = aui
  .tool('file-ops')
  .input(z.object({
    operation: z.enum(['read', 'write', 'list']),
    path: z.string(),
    content: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Server-only file operations
    const fs = await import('fs/promises');
    
    switch (input.operation) {
      case 'read':
        return await fs.readFile(input.path, 'utf-8');
      case 'write':
        await fs.writeFile(input.path, input.content!);
        return { success: true, path: input.path };
      case 'list':
        return await fs.readdir(input.path);
    }
  })
  .render(({ data }) => (
    <pre className="code-block">{JSON.stringify(data, null, 2)}</pre>
  ));

// Database query tool
const dbTool = aui
  .tool('database')
  .input(z.object({
    query: z.string(),
    params: z.array(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Execute database query on server
    return await db.query(input.query, input.params);
  })
  .render(({ data }) => (
    <Table data={data} />
  ));

// All tools are immediately available - no .build() needed!
// AI agents can discover and execute these tools:

export async function handleAIToolCall(toolCall: any) {
  const tool = aui.get(toolCall.name);
  if (!tool) {
    throw new Error(`Tool ${toolCall.name} not found`);
  }
  
  const result = await tool.run(toolCall.input);
  return result;
}

// Export for AI agent discovery
export const availableTools = aui.list().map(tool => ({
  name: tool.name,
  description: tool.description,
  schema: tool.schema
}));

// Helper components (these would be imported from your component library)
function SearchResults({ results }: any) {
  return <div>{/* render results */}</div>;
}

function UserCard({ user }: any) {
  return <div>{/* render user card */}</div>;
}

function Spinner() {
  return <div>Loading...</div>;
}

function Chart({ data }: any) {
  return <div>{/* render chart */}</div>;
}

function Table({ data }: any) {
  return <div>{/* render table */}</div>;
}

// Mock functions (these would be your actual implementations)
async function createUser(data: any) { return { id: '1', ...data }; }
async function updateUser(id: string, data: any) { return { id, ...data }; }
async function deleteUser(id: string) { return { success: true, id }; }
async function fetchAnalytics(metric: string, timeframe: string) { return { metric, timeframe, value: 100 }; }

const db = {
  search: async (query: string) => [{ id: 1, title: 'Result' }],
  query: async (sql: string, params?: any[]) => []
};

// Import the hook (already implemented in lib/aui)
import { useAUITool } from '@/lib/aui';