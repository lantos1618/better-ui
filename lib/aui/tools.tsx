'use client';

import React from 'react';
import { z } from 'zod';
import aui from './index';

// Simple weather tool - server only
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Mock weather API call
    const temps: Record<string, number> = {
      'New York': 72,
      'Los Angeles': 85,
      'Chicago': 68,
      'Houston': 90,
      'Phoenix': 105,
    };
    return { 
      temp: temps[input.city] || Math.floor(Math.random() * 30) + 60,
      city: input.city,
      conditions: 'Partly cloudy',
      humidity: 65
    };
  })
  .render(({ data }) => (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl font-semibold">{data.temp}°F</p>
      <p className="text-gray-600">{data.conditions}</p>
      <p className="text-sm text-gray-500">Humidity: {data.humidity}%</p>
    </div>
  ));

// Complex search tool with client-side caching
export const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side database search
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate DB delay
    return {
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        description: `This is a search result for the query "${input.query}"`,
        url: `https://example.com/result-${i + 1}`,
        relevance: Math.random()
      })).sort((a, b) => b.relevance - a.relevance)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) {
      console.log('Returning cached search results');
      return cached;
    }
    
    // Fetch from API
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    ctx.cache.set(cacheKey, data);
    return data;
  })
  .render(({ data, loading }) => (
    <div className="space-y-2">
      {loading && <div className="text-gray-500">Searching...</div>}
      {data?.results.map((result: any) => (
        <div key={result.id} className="p-3 border rounded hover:bg-gray-50">
          <h4 className="font-semibold text-blue-600">{result.title}</h4>
          <p className="text-sm text-gray-600">{result.description}</p>
          <a href={result.url} className="text-xs text-green-600">{result.url}</a>
        </div>
      ))}
    </div>
  ));

// Calculator tool - pure client-side
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({
    expression: z.string(),
    precision: z.number().optional().default(2)
  }))
  .execute(async ({ input }) => {
    // Safe math evaluation
    const evaluate = (expr: string): number => {
      // Remove whitespace and validate
      const cleaned = expr.replace(/\s/g, '');
      if (!/^[\d+\-*/().\s]+$/.test(cleaned)) {
        throw new Error('Invalid expression');
      }
      
      // Use Function constructor for safe evaluation
      try {
        return new Function('return ' + cleaned)();
      } catch (e) {
        throw new Error('Failed to evaluate expression');
      }
    };
    
    const result = evaluate(input.expression);
    return {
      expression: input.expression,
      result: Number(result.toFixed(input.precision)),
      formatted: result.toLocaleString('en-US', { 
        maximumFractionDigits: input.precision 
      })
    };
  })
  .render(({ data, error }) => (
    <div className="p-4 border rounded-lg bg-gray-50 font-mono">
      {error ? (
        <div className="text-red-600">Error: {error.message}</div>
      ) : data ? (
        <>
          <div className="text-gray-600">{data.expression} =</div>
          <div className="text-2xl font-bold">{data.formatted}</div>
        </>
      ) : null}
    </div>
  ));

// File upload tool with progress
export const uploadTool = aui
  .tool('upload')
  .input(z.object({
    file: z.instanceof(File),
    path: z.string().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    const formData = new FormData();
    formData.append('file', input.file);
    if (input.path) formData.append('path', input.path);
    
    const response = await ctx.fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    return await response.json();
  })
  .render(({ data, loading }) => (
    <div className="p-4 border rounded-lg">
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          <span>Uploading...</span>
        </div>
      ) : data ? (
        <div className="text-green-600">
          ✓ Uploaded: {data.filename} ({data.size} bytes)
        </div>
      ) : null}
    </div>
  ));

// Data visualization tool
export const chartTool = aui
  .tool('chart')
  .input(z.object({
    type: z.enum(['bar', 'line', 'pie']),
    data: z.array(z.object({
      label: z.string(),
      value: z.number()
    }))
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => {
    const max = Math.max(...data.data.map(d => d.value));
    
    if (data.type === 'bar') {
      return (
        <div className="space-y-2 p-4">
          {data.data.map((item, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span className="w-20 text-sm">{item.label}</span>
              <div className="flex-1 bg-gray-200 rounded">
                <div 
                  className="bg-blue-500 h-6 rounded"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
              <span className="text-sm font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      );
    }
    
    return <div>Chart type {data.type} not implemented</div>;
  });

// Export all tools
export const tools = {
  weather: weatherTool,
  search: searchTool,
  calculator: calculatorTool,
  upload: uploadTool,
  chart: chartTool
};

export default tools;