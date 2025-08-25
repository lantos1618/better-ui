'use client';

import React from 'react';
import aui from '../index';
import { z } from 'zod';

// 1. WEATHER TOOL - Simple server execution with UI
const weatherTool = aui
  .tool('weather')
  .input(z.object({ 
    city: z.string(),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius')
  }))
  .execute(async ({ input }) => {
    // Simulated API call
    const temps: Record<string, number> = { 'New York': 72, 'London': 18, 'Tokyo': 25 };
    const temp = temps[input.city] || Math.floor(Math.random() * 30);
    return { 
      city: input.city,
      temp: input.units === 'fahrenheit' ? temp : Math.round((temp - 32) * 5/9),
      units: input.units,
      conditions: 'Partly cloudy',
      humidity: 65
    };
  })
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <div className="text-2xl">{data.temp}°{data.units === 'celsius' ? 'C' : 'F'}</div>
      <div className="text-gray-600">{data.conditions}</div>
      <div className="text-sm">Humidity: {data.humidity}%</div>
    </div>
  ));

// 2. DATABASE SEARCH - With client-side caching
const searchTool = aui
  .tool('database-search')
  .input(z.object({ 
    query: z.string().min(1),
    limit: z.number().optional().default(10),
    filters: z.object({
      category: z.string().optional(),
      dateRange: z.object({
        from: z.string().optional(),
        to: z.string().optional()
      }).optional()
    }).optional()
  }))
  .execute(async ({ input }) => {
    // Server-side database query
    const results = Array.from({ length: input.limit || 10 }, (_, i) => ({
      id: `result-${i}`,
      title: `${input.query} result ${i + 1}`,
      description: `Found in category: ${input.filters?.category || 'all'}`,
      relevance: Math.random(),
      timestamp: new Date().toISOString()
    }));
    return results.sort((a: any, b: any) => b.relevance - a.relevance);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = JSON.stringify(input);
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log('Using cached results');
      return cached.data;
    }
    
    // Fetch from server
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    
    // Cache the results
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div className="animate-pulse">Searching...</div>;
    if (error) return <div className="text-red-500">Error: {error.message}</div>;
    
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-500">Found {data.length} results</div>
        {data.map((item: any) => (
          <div key={item.id} className="p-3 border rounded-lg hover:bg-gray-50">
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-gray-600">{item.description}</div>
            <div className="text-xs text-gray-400 mt-1">
              Relevance: {(item.relevance * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    );
  });

// 3. FILE UPLOAD - Client-side processing with server backup
const uploadTool = aui
  .tool('file-upload')
  .input(z.object({
    file: z.instanceof(File),
    processLocally: z.boolean().optional().default(true)
  }))
  .clientExecute(async ({ input, ctx }) => {
    if (input.processLocally && input.file.size < 5 * 1024 * 1024) {
      // Process small files locally
      const text = await input.file.text();
      return {
        name: input.file.name,
        size: input.file.size,
        type: input.file.type,
        preview: text.substring(0, 200),
        processedLocally: true
      };
    }
    
    // Large files go to server
    const formData = new FormData();
    formData.append('file', input.file);
    
    const response = await ctx.fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  })
  .render(({ data }) => (
    <div className="p-4 bg-green-50 rounded-lg">
      <div className="font-medium">{data.name}</div>
      <div className="text-sm text-gray-600">
        Size: {(data.size / 1024).toFixed(2)} KB
      </div>
      <div className="text-sm text-gray-600">Type: {data.type}</div>
      {data.processedLocally && (
        <div className="text-xs text-blue-600 mt-2">
          ✓ Processed locally
        </div>
      )}
      {data.preview && (
        <div className="mt-2 p-2 bg-white rounded text-xs font-mono">
          {data.preview}...
        </div>
      )}
    </div>
  ));

// 4. FORM SUBMISSION - With validation and middleware
const formTool = aui
  .tool('contact-form')
  .input(z.object({
    name: z.string().min(2, 'Name too short'),
    email: z.string().email('Invalid email'),
    subject: z.string().min(5, 'Subject too short'),
    message: z.string().min(10, 'Message too short'),
    newsletter: z.boolean().optional().default(false)
  }))
  .middleware(async ({ input, ctx, next }) => {
    // Rate limiting
    const lastSubmit = ctx.cache.get(`submit-${ctx.user?.id || 'anon'}`);
    if (lastSubmit && Date.now() - lastSubmit < 60000) {
      throw new Error('Please wait before submitting again');
    }
    
    // Log submission
    console.log('Form submission:', { 
      user: ctx.user?.id,
      timestamp: new Date().toISOString()
    });
    
    const result = await next();
    
    // Cache submission time
    ctx.cache.set(`submit-${ctx.user?.id || 'anon'}`, Date.now());
    
    return result;
  })
  .execute(async ({ input }) => {
    // Send email, save to database, etc.
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      ticketId: `TICKET-${Date.now()}`,
      message: `Thank you ${input.name}, we'll respond within 24 hours.`,
      newsletter: input.newsletter
    };
  })
  .render(({ data, loading, error }) => {
    if (loading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent" />
          <span>Submitting...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error.message}
        </div>
      );
    }
    
    return (
      <div className="p-4 bg-green-50 rounded-lg">
        <div className="text-green-700 font-medium">✓ {data.message}</div>
        <div className="text-sm text-gray-600 mt-1">
          Ticket ID: {data.ticketId}
        </div>
        {data.newsletter && (
          <div className="text-sm text-blue-600 mt-2">
            📧 You've been added to our newsletter
          </div>
        )}
      </div>
    );
  });

// 5. REALTIME UPDATES - WebSocket-like behavior
const realtimeTool = aui
  .tool('stock-price')
  .input(z.object({ 
    symbol: z.string().toUpperCase(),
    interval: z.number().optional().default(5000)
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Initial fetch
    const price = 100 + Math.random() * 50;
    const change = (Math.random() - 0.5) * 10;
    
    return {
      symbol: input.symbol,
      price: price.toFixed(2),
      change: change.toFixed(2),
      changePercent: ((change / price) * 100).toFixed(2),
      timestamp: new Date().toISOString(),
      volume: Math.floor(Math.random() * 1000000)
    };
  })
  .render(({ data }) => (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-2xl font-bold">{data.symbol}</div>
          <div className="text-3xl font-mono">${data.price}</div>
        </div>
        <div className={`text-right ${parseFloat(data.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <div className="text-lg">
            {parseFloat(data.change) >= 0 ? '↑' : '↓'} {data.change}
          </div>
          <div className="text-sm">
            ({data.changePercent}%)
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Volume: {data.volume.toLocaleString()}
      </div>
    </div>
  ));

// 6. AI ASSISTANT - Complex tool with streaming
const assistantTool = aui
  .tool('ai-assistant')
  .input(z.object({
    prompt: z.string(),
    model: z.enum(['gpt-4', 'claude', 'llama']).optional().default('gpt-4'),
    stream: z.boolean().optional().default(true),
    context: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string()
    })).optional()
  }))
  .execute(async ({ input }) => {
    // Simulated AI response
    const responses = {
      'gpt-4': 'I can help you with that using GPT-4...',
      'claude': 'Let me assist you with Claude\'s capabilities...',
      'llama': 'Here\'s what I can do with Llama...'
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      response: responses[input.model || 'gpt-4'] + '\n\n' + `Your prompt: "${input.prompt}"`,
      model: input.model || 'gpt-4',
      tokens: Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString()
    };
  })
  .render(({ data, loading }) => {
    if (loading) {
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-purple-600">
            {data.model?.toUpperCase() || 'AI'}
          </span>
          <span className="text-xs text-gray-500">
            {data.tokens} tokens
          </span>
        </div>
        <div className="prose prose-sm">
          {data.response}
        </div>
      </div>
    );
  });

// 7. CHART GENERATOR - Data visualization tool
const chartTool = aui
  .tool('generate-chart')
  .input(z.object({
    type: z.enum(['bar', 'line', 'pie', 'scatter']),
    data: z.array(z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional()
    })),
    title: z.string().optional(),
    showLegend: z.boolean().optional().default(true)
  }))
  .execute(async ({ input }) => {
    // Process and normalize data
    const total = input.data.reduce((sum, item) => sum + item.value, 0);
    const processed = input.data.map(item => ({
      ...item,
      percentage: ((item.value / total) * 100).toFixed(1),
      color: item.color || `hsl(${Math.random() * 360}, 70%, 50%)`
    }));
    
    return {
      type: input.type,
      title: input.title || 'Chart',
      data: processed,
      total,
      showLegend: input.showLegend
    };
  })
  .render(({ data }) => (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="font-bold text-lg mb-4">{data.title}</h3>
      
      {data.type === 'bar' && (
        <div className="space-y-2">
          {data.data.map((item: any) => (
            <div key={item.label} className="flex items-center space-x-2">
              <div className="w-20 text-sm">{item.label}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full transition-all"
                  style={{ 
                    width: `${item.percentage}%`,
                    backgroundColor: item.color
                  }}
                />
                <span className="absolute right-2 top-0 text-xs leading-6">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {data.type === 'pie' && (
        <div className="flex items-center justify-center">
          <div className="w-48 h-48 rounded-full relative overflow-hidden border-4">
            {/* Simplified pie chart */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
          {data.showLegend && (
            <div className="ml-8 space-y-1">
              {data.data.map((item: any) => (
                <div key={item.label} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">
                    {item.label}: {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  ));

// Export all tools
export {
  weatherTool,
  searchTool,
  uploadTool,
  formTool,
  realtimeTool,
  assistantTool,
  chartTool
};

// Export as collection
export const tools = {
  weather: weatherTool,
  search: searchTool,
  upload: uploadTool,
  form: formTool,
  realtime: realtimeTool,
  assistant: assistantTool,
  chart: chartTool
};

export default tools;