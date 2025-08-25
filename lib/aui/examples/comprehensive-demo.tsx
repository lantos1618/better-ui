import React from 'react';
import aui from '../index';
import { z } from 'zod';

// ===========================================
// SIMPLE TOOLS - Just 2-3 methods
// ===========================================

// 1. Weather tool - simplest possible tool
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// 2. Calculator tool - with validation
const calculatorTool = aui
  .tool('calculator')
  .input(z.object({ 
    a: z.number(),
    b: z.number(),
    operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
  }))
  .execute(async ({ input }) => {
    const { a, b, operation } = input;
    switch(operation) {
      case 'add': return { result: a + b };
      case 'subtract': return { result: a - b };
      case 'multiply': return { result: a * b };
      case 'divide': return { result: b !== 0 ? a / b : NaN };
      default: throw new Error('Invalid operation');
    }
  })
  .render(({ data, input }) => (
    <div className="font-mono">
      {input?.a} {input?.operation} {input?.b} = {data.result}
    </div>
  ));

// ===========================================
// COMPLEX TOOLS - With client optimization
// ===========================================

// 3. Search tool with caching
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: hit the database
    const results = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first, then fetch
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) {
      console.log('Cache hit:', cacheKey);
      return cached;
    }
    
    const results = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(cacheKey, results);
    return results;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Searching...</div>;
    if (error) return <div className="text-red-500">Error: {error.message}</div>;
    
    return (
      <div className="space-y-2">
        {(data as any[])?.map((item: any) => (
          <div key={item.id} className="p-3 border rounded hover:bg-gray-50">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    );
  });

// 4. User profile tool with authentication
const userProfileTool = aui
  .tool('user-profile')
  .input(z.object({ userId: z.string() }))
  .middleware(async ({ ctx, next }) => {
    // Check authentication
    if (!ctx?.user) {
      throw new Error('Authentication required');
    }
    return next();
  })
  .execute(async ({ input }) => {
    // Server-side: fetch from database
    const profile = await fetch(`/api/users/${input.userId}`).then(r => r.json());
    return profile;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: use session data if available
    if (ctx.user?.id === input.userId) {
      return ctx.user; // Use session data for current user
    }
    
    // Otherwise fetch from API
    return ctx.fetch(`/api/users/${input.userId}`, {
      headers: ctx.headers
    }).then(r => r.json());
  })
  .render(({ data }) => (
    <div className="p-4 border rounded-lg">
      <img src={data.avatar} alt={data.name} className="w-16 h-16 rounded-full" />
      <h2 className="text-xl font-bold mt-2">{data.name}</h2>
      <p className="text-gray-600">{data.email}</p>
      <p className="text-sm text-gray-500">Member since {data.createdAt}</p>
    </div>
  ));

// ===========================================
// DATABASE TOOLS - Full CRUD operations
// ===========================================

// 5. Todo CRUD tool
const todoTool = aui
  .tool('todo-crud')
  .input(z.object({
    action: z.enum(['create', 'read', 'update', 'delete', 'list']),
    id: z.string().optional(),
    data: z.object({
      title: z.string(),
      completed: z.boolean(),
      description: z.string().optional()
    }).optional()
  }))
  .execute(async ({ input }) => {
    const { action, id, data } = input;
    
    switch(action) {
      case 'create':
        return { id: crypto.randomUUID(), ...data, createdAt: new Date() };
      
      case 'read':
        if (!id) throw new Error('ID required for read');
        return { id, title: 'Sample Todo', completed: false };
      
      case 'update':
        if (!id) throw new Error('ID required for update');
        return { id, ...data, updatedAt: new Date() };
      
      case 'delete':
        if (!id) throw new Error('ID required for delete');
        return { success: true, deletedId: id };
      
      case 'list':
        return [
          { id: '1', title: 'Task 1', completed: true },
          { id: '2', title: 'Task 2', completed: false }
        ];
      
      default:
        throw new Error('Invalid action');
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: optimistic updates
    const { action, id, data } = input;
    
    if (action === 'create' && data) {
      // Optimistically add to local state
      const newTodo = { id: `temp-${Date.now()}`, ...data };
      
      // Then sync with server
      ctx.fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(async (res) => {
        const serverTodo = await res.json();
        // Update local state with server response
        console.log('Todo synced:', serverTodo);
      });
      
      return newTodo;
    }
    
    // For other actions, call server
    return ctx.fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
  })
  .render(({ data, input }) => {
    const action = input?.action;
    
    if (action === 'list' && Array.isArray(data)) {
      return (
        <ul className="space-y-2">
          {data.map((todo: any) => (
            <li key={todo.id} className="flex items-center gap-2">
              <input type="checkbox" checked={todo.completed} readOnly />
              <span className={todo.completed ? 'line-through' : ''}>
                {todo.title}
              </span>
            </li>
          ))}
        </ul>
      );
    }
    
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded">
        <p>Action: {action}</p>
        <pre className="text-xs mt-2">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  });

// ===========================================
// REAL-TIME TOOLS - WebSocket & SSE
// ===========================================

// 6. Chat tool with real-time updates
const chatTool = aui
  .tool('chat')
  .input(z.object({
    message: z.string(),
    roomId: z.string()
  }))
  .execute(async ({ input }) => {
    // Server-side: broadcast to room
    return {
      id: crypto.randomUUID(),
      message: input.message,
      roomId: input.roomId,
      timestamp: new Date(),
      user: 'current-user'
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: send via WebSocket if available
    if ((ctx as any).ws) {
      (ctx as any).ws.send(JSON.stringify({
        type: 'chat',
        ...input
      }));
      return { sent: true, ...input };
    }
    
    // Fallback to HTTP
    return ctx.fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
  })
  .render(({ data }) => (
    <div className="flex items-start gap-2 p-2 hover:bg-gray-50">
      <span className="text-sm font-medium">{data.user}:</span>
      <span className="text-sm">{data.message}</span>
      <span className="text-xs text-gray-400 ml-auto">
        {new Date(data.timestamp).toLocaleTimeString()}
      </span>
    </div>
  ));

// ===========================================
// FILE HANDLING TOOLS
// ===========================================

// 7. File upload tool
const fileUploadTool = aui
  .tool('file-upload')
  .input(z.object({
    file: z.instanceof(File),
    path: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side: handle file upload
    const formData = new FormData();
    formData.append('file', input.file);
    if (input.path) formData.append('path', input.path);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: show progress
    const formData = new FormData();
    formData.append('file', input.file);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          console.log(`Upload progress: ${percentComplete}%`);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });
      
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  })
  .render(({ data, loading }) => {
    if (loading) return <div>Uploading...</div>;
    
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="font-medium">File uploaded successfully!</p>
        <p className="text-sm text-gray-600">URL: {data.url}</p>
        <p className="text-sm text-gray-600">Size: {data.size} bytes</p>
      </div>
    );
  });

// ===========================================
// EXPORT ALL TOOLS
// ===========================================

export const tools = {
  weather: weatherTool,
  calculator: calculatorTool,
  search: searchTool,
  userProfile: userProfileTool,
  todo: todoTool,
  chat: chatTool,
  fileUpload: fileUploadTool
};

// Export individual tools
export {
  weatherTool,
  calculatorTool,
  searchTool,
  userProfileTool,
  todoTool,
  chatTool,
  fileUploadTool
};

// Example usage function
export async function exampleUsage() {
  // Simple execution
  const weatherResult = await weatherTool.run({ city: 'NYC' });
  console.log('Weather:', weatherResult);
  
  // With context
  const searchResult = await searchTool.run(
    { query: 'typescript' },
    {
      cache: new Map(),
      fetch: globalThis.fetch,
      user: { id: '123', name: 'John' }
    }
  );
  console.log('Search:', searchResult);
  
  // CRUD operations
  const newTodo = await todoTool.run({
    action: 'create',
    data: { title: 'Learn AUI', completed: false }
  });
  console.log('New todo:', newTodo);
}

export default tools;