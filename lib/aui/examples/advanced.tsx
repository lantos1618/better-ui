import React from 'react';
import aui, { z } from '../index';

// Advanced tool with middleware and tags
export const dbQueryTool = aui
  .tool('dbQuery')
  .describe('Execute database queries with caching and auth')
  .tag('database', 'backend')
  .input(z.object({
    query: z.string(),
    params: z.array(z.any()).optional(),
    cache: z.boolean().optional().default(true)
  }))
  .middleware(async ({ input, ctx, next }) => {
    // Log query execution
    console.log(`[DB Query] Executing: ${input.query}`);
    const startTime = Date.now();
    
    try {
      const result = await next();
      console.log(`[DB Query] Completed in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      console.error(`[DB Query] Failed:`, error);
      throw error;
    }
  })
  .middleware(async ({ input, ctx, next }) => {
    // Check authentication
    if (!ctx.user) {
      throw new Error('Authentication required for database queries');
    }
    return next();
  })
  .execute(async ({ input, ctx }) => {
    // Simulate database query
    await new Promise(r => setTimeout(r, 100));
    
    return {
      rows: [
        { id: 1, name: 'Item 1', created: new Date().toISOString() },
        { id: 2, name: 'Item 2', created: new Date().toISOString() },
      ],
      query: input.query,
      cached: false
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    if (input.cache) {
      const cacheKey = `db:${input.query}:${JSON.stringify(input.params)}`;
      const cached = ctx.cache.get(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }
    }
    
    // Fetch from server
    const response = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'dbQuery',
        input,
        context: { user: ctx.user }
      })
    });
    
    const { data } = await response.json();
    
    // Cache result
    if (input.cache) {
      const cacheKey = `db:${input.query}:${JSON.stringify(input.params)}`;
      ctx.cache.set(cacheKey, data);
    }
    
    return data;
  })
  .render(({ data, input }) => (
    <div className="space-y-2">
      <div className="text-sm text-gray-500">
        Query: {input?.query} {data.cached && '(cached)'}
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any) => (
            <tr key={row.id}>
              <td className="px-4 py-2">{row.id}</td>
              <td className="px-4 py-2">{row.name}</td>
              <td className="px-4 py-2">{new Date(row.created).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ));

// Real-time data streaming tool
export const realtimeTool = aui
  .tool('realtime')
  .describe('Stream real-time data updates')
  .tag('streaming', 'realtime')
  .input(z.object({
    channel: z.string(),
    initialData: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side: return initial data
    return {
      channel: input.channel,
      data: input.initialData || [],
      timestamp: Date.now()
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: establish WebSocket or SSE connection
    // This is a simplified example
    return new Promise((resolve) => {
      const eventSource = new EventSource(`/api/stream/${input.channel}`);
      const data: any[] = [];
      
      eventSource.onmessage = (event) => {
        data.push(JSON.parse(event.data));
        // In a real implementation, you'd update state here
      };
      
      // Clean up after 5 seconds for demo
      setTimeout(() => {
        eventSource.close();
        resolve({
          channel: input.channel,
          data,
          timestamp: Date.now()
        });
      }, 5000);
    });
  })
  .render(({ data }) => (
    <div className="p-4 bg-green-50 rounded">
      <h4 className="font-semibold">Channel: {data.channel}</h4>
      <p className="text-sm text-gray-600">
        Last update: {new Date(data.timestamp).toLocaleTimeString()}
      </p>
      <div className="mt-2">
        {data.data.length} items received
      </div>
    </div>
  ));

// File upload tool
export const fileUploadTool = aui
  .tool('fileUpload')
  .describe('Handle file uploads with progress tracking')
  .tag('file', 'upload')
  .input(z.object({
    file: z.instanceof(File),
    destination: z.string().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    const formData = new FormData();
    formData.append('file', input.file);
    if (input.destination) {
      formData.append('destination', input.destination);
    }
    
    // Upload with progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          console.log(`Upload progress: ${progress}%`);
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
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded">
      <p className="font-semibold">File uploaded successfully!</p>
      <p className="text-sm">{JSON.stringify(data)}</p>
    </div>
  ));

// AI completion tool
export const aiCompletionTool = aui
  .tool('aiCompletion')
  .describe('Generate AI completions with streaming support')
  .tag('ai', 'generation')
  .input(z.object({
    prompt: z.string(),
    model: z.enum(['gpt-3.5-turbo', 'gpt-4']).optional().default('gpt-3.5-turbo'),
    stream: z.boolean().optional().default(false)
  }))
  .execute(async ({ input }) => {
    // Server-side AI completion
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: 'user', content: input.prompt }],
        stream: input.stream
      })
    });
    
    if (input.stream) {
      // Handle streaming response
      return { streaming: true, response };
    }
    
    const data = await response.json();
    return {
      completion: data.choices[0].message.content,
      model: input.model,
      tokens: data.usage
    };
  })
  .render(({ data }) => (
    <div className="p-4 bg-purple-50 rounded space-y-2">
      <div className="font-semibold">AI Response ({data.model})</div>
      <div className="whitespace-pre-wrap">{data.completion}</div>
      {data.tokens && (
        <div className="text-xs text-gray-500">
          Tokens: {data.tokens.total_tokens}
        </div>
      )}
    </div>
  ));

// Notification tool with different types
export const notificationTool = aui
  .tool('notification')
  .describe('Display various types of notifications')
  .tag('ui', 'notification')
  .input(z.object({
    type: z.enum(['success', 'error', 'warning', 'info']),
    title: z.string(),
    message: z.string(),
    duration: z.number().optional().default(5000)
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => {
    const colors = {
      success: 'bg-green-100 text-green-800 border-green-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return (
      <div className={`p-4 rounded-lg border ${colors[data.type]}`}>
        <h4 className="font-semibold">{data.title}</h4>
        <p className="text-sm mt-1">{data.message}</p>
      </div>
    );
  });

// Export all advanced tools
export const advancedTools = {
  dbQuery: dbQueryTool,
  realtime: realtimeTool,
  fileUpload: fileUploadTool,
  aiCompletion: aiCompletionTool,
  notification: notificationTool
};

export default advancedTools;