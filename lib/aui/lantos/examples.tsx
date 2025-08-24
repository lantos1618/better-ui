import React from 'react';
import { z } from 'zod';
import aui from '../lantos';

// Simple tool - just 2 methods
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Simulate API call
    await new Promise(r => setTimeout(r, 500));
    return { 
      temp: Math.round(50 + Math.random() * 50), 
      city: input.city,
      conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
    };
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Loading weather...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!data) return null;
    
    return (
      <div className="weather-card">
        <h3>{data.city}</h3>
        <p>{data.temp}°F</p>
        <p>{data.conditions}</p>
      </div>
    );
  });

// Complex tool - adds client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10),
    filters: z.object({
      category: z.string().optional(),
      dateRange: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }).optional(),
    }).optional(),
  }))
  .execute(async ({ input }) => {
    // Server-side database search
    await new Promise(r => setTimeout(r, 1000));
    return {
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        description: `This is a search result for ${input.query}`,
        score: Math.random(),
      })).sort((a, b) => b.score - a.score),
      total: 100,
      query: input.query,
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${JSON.stringify(input)}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }

    // Fetch from API
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    
    // Cache the result
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  })
  .render(({ data, loading, error, input }) => {
    if (loading) return <div>Searching for "{input?.query}"...</div>;
    if (error) return <div>Search error: {error.message}</div>;
    if (!data) return null;

    return (
      <div className="search-results">
        <h3>Search Results for "{data.query}"</h3>
        <p>{data.total} total results</p>
        <ul>
          {data.results.map(result => (
            <li key={result.id}>
              <h4>{result.title}</h4>
              <p>{result.description}</p>
              <small>Score: {result.score.toFixed(2)}</small>
            </li>
          ))}
        </ul>
      </div>
    );
  });

// Database tool with retry and caching
export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['read', 'write', 'delete']),
    table: z.string(),
    data: z.any().optional(),
    id: z.string().optional(),
  }))
  .execute(async ({ input }) => {
    // Simulate database operations
    await new Promise(r => setTimeout(r, 300));
    
    switch (input.operation) {
      case 'read':
        return { 
          id: input.id || 'all',
          data: input.id ? { id: input.id, name: 'Item' } : []
        };
      case 'write':
        return { success: true, id: Math.random().toString(36) };
      case 'delete':
        return { success: true, deleted: input.id };
      default:
        throw new Error('Invalid operation');
    }
  })
  .render(({ data, loading }) => {
    if (loading) return <div>Processing database operation...</div>;
    if (!data) return null;
    
    return (
      <div className="database-result">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  });

// File upload tool
export const uploadTool = aui
  .tool('upload')
  .input(z.object({
    file: z.instanceof(File),
    path: z.string().optional(),
  }))
  .execute(async ({ input }) => {
    const formData = new FormData();
    formData.append('file', input.file);
    if (input.path) formData.append('path', input.path);

    // Simulate upload
    await new Promise(r => setTimeout(r, 2000));
    
    return {
      url: `/uploads/${input.file.name}`,
      size: input.file.size,
      type: input.file.type,
      name: input.file.name,
    };
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Uploading file...</div>;
    if (error) return <div>Upload failed: {error.message}</div>;
    if (!data) return null;

    return (
      <div className="upload-result">
        <h4>Upload Successful</h4>
        <p>File: {data.name}</p>
        <p>Size: {(data.size / 1024).toFixed(2)} KB</p>
        <p>Type: {data.type}</p>
        <a href={data.url}>View File</a>
      </div>
    );
  });

// Chat/conversation tool
export const chatTool = aui
  .tool('chat')
  .input(z.object({
    message: z.string(),
    context: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }))
  .execute(async ({ input }) => {
    // Simulate AI response
    await new Promise(r => setTimeout(r, 1500));
    
    return {
      response: `I received your message: "${input.message}". This is a simulated response.`,
      timestamp: new Date().toISOString(),
      tokens: Math.floor(Math.random() * 100) + 50,
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Stream response from server
    const response = await ctx.fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new Error('Chat request failed');

    return response.json();
  })
  .render(({ data, loading, input }) => {
    if (loading) return <div>AI is thinking...</div>;
    if (!data) return null;

    return (
      <div className="chat-response">
        <div className="user-message">You: {input?.message}</div>
        <div className="ai-message">AI: {data.response}</div>
        <small>Tokens used: {data.tokens}</small>
      </div>
    );
  });

// Analytics tool
export const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    metric: z.enum(['pageviews', 'users', 'events']),
    period: z.enum(['day', 'week', 'month']),
    groupBy: z.string().optional(),
  }))
  .execute(async ({ input }) => {
    await new Promise(r => setTimeout(r, 800));
    
    const data = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 1000) + 100,
    }));

    return {
      metric: input.metric,
      period: input.period,
      data,
      total: data.reduce((sum, d) => sum + d.value, 0),
    };
  })
  .render(({ data, loading }) => {
    if (loading) return <div>Loading analytics...</div>;
    if (!data) return null;

    return (
      <div className="analytics">
        <h3>{data.metric} - {data.period}</h3>
        <p>Total: {data.total.toLocaleString()}</p>
        <div className="chart">
          {data.data.map(d => (
            <div key={d.date} className="bar">
              <div style={{ height: `${d.value / 10}px` }} />
              <span>{d.date}</span>
            </div>
          ))}
        </div>
      </div>
    );
  });

// Export all tools
export const tools = {
  weather: weatherTool,
  search: searchTool,
  database: databaseTool,
  upload: uploadTool,
  chat: chatTool,
  analytics: analyticsTool,
};