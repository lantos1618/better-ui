'use client';

import React from 'react';
import aui, { z } from '../index';

// Simple weather tool - minimal API as requested
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex search tool with client-side caching
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    const response = await fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
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
      {data?.results?.map((item: any) => (
        <div key={item.id} className="p-2 border rounded">
          {item.title}
        </div>
      ))}
    </div>
  ));

// User management tool - demonstrates full AI control
const userTool = aui
  .tool('user_management')
  .input(z.object({
    action: z.enum(['create', 'update', 'delete', 'list']),
    data: z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      email: z.string().email().optional()
    }).optional()
  }))
  .execute(async ({ input, ctx }) => {
    // Server-side user operations
    switch (input.action) {
      case 'create':
        return { 
          id: crypto.randomUUID(), 
          ...input.data,
          createdAt: new Date().toISOString()
        };
      case 'update':
        return { 
          ...input.data, 
          updatedAt: new Date().toISOString() 
        };
      case 'delete':
        return { success: true, id: input.data?.id };
      case 'list':
        return { 
          users: [],
          total: 0 
        };
    }
  })
  .render(({ data, input }) => (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold">User {input?.action || 'action'}</h3>
      <pre className="mt-2 text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  ));

// Analytics tool - server-only execution
const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Track analytics event server-side
    console.log('Analytics event:', input);
    return { 
      tracked: true, 
      event: input.event,
      timestamp: Date.now()
    };
  });

// Form processing with validation
const formTool = aui
  .tool('process_form')
  .input(z.object({
    formData: z.record(z.string()),
    validate: z.boolean().default(true)
  }))
  .execute(async ({ input }) => {
    if (input.validate) {
      // Validate form data
      const errors: Record<string, string> = {};
      if (!input.formData.email?.includes('@')) {
        errors.email = 'Invalid email';
      }
      if (Object.keys(errors).length > 0) {
        throw new Error(JSON.stringify(errors));
      }
    }
    
    return {
      success: true,
      processed: input.formData,
      id: crypto.randomUUID()
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Optimistic UI update
    const tempId = `temp_${Date.now()}`;
    
    // Show immediate feedback
    const result = await ctx.fetch('/api/tools/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    return result;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Processing...</div>;
    if (error) return <div className="text-red-600">Error: {error.message}</div>;
    return (
      <div className="p-4 bg-green-100 rounded">
        ✅ Form processed successfully
        <div className="text-sm mt-2">ID: {data?.id}</div>
      </div>
    );
  });

// Real-time collaboration tool
const collaborationTool = aui
  .tool('collaborate')
  .input(z.object({
    action: z.enum(['join', 'leave', 'message', 'sync']),
    room: z.string(),
    data: z.any().optional()
  }))
  .clientExecute(async ({ input }) => {
    // WebSocket or WebRTC operations
    const ws = new WebSocket(`wss://api.example.com/collab/${input.room}`);
    
    switch (input.action) {
      case 'join':
        return new Promise((resolve) => {
          ws.onopen = () => resolve({ joined: true, room: input.room });
        });
      case 'message':
        ws.send(JSON.stringify(input.data));
        return { sent: true };
      case 'sync':
        return { synced: true, timestamp: Date.now() };
      case 'leave':
        ws.close();
        return { left: true };
    }
  })
  .render(({ data }) => (
    <div className="p-2 bg-blue-100 rounded">
      Collaboration: {JSON.stringify(data)}
    </div>
  ));

// Export all tools
export const aiTools = {
  weather: weatherTool,
  search: searchTool,
  user: userTool,
  analytics: analyticsTool,
  form: formTool,
  collaboration: collaborationTool
};

// Example usage in a component
export function AIControlDemo() {
  const [results, setResults] = React.useState<any[]>([]);
  
  const executeTools = async () => {
    // AI can call these tools directly
    const weather = await weatherTool.run({ city: 'San Francisco' });
    const search = await searchTool.run({ query: 'AI tools' });
    
    setResults([weather, search]);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">AI Control Demo</h1>
      
      <button 
        onClick={executeTools}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Execute AI Tools
      </button>
      
      <div className="mt-4 space-y-4">
        {results.map((result, i) => (
          <div key={i} className="p-4 border rounded">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export default aiTools;