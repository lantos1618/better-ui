import React from 'react';
import aui, { z } from '../index';

// Simple weather tool - just 2 methods (execute + render)
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Simulate weather API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return { 
      temp: Math.floor(Math.random() * 30) + 60,
      city: input.city,
      condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
    };
  })
  .render(({ data }) => (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="text-lg font-bold">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.condition}</p>
    </div>
  ));

// Complex search tool - adds client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side: simulate database search
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      query: input.query,
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        description: `This is a search result for ${input.query}`,
        url: `https://example.com/result/${i + 1}`,
        score: Math.random()
      })).sort((a, b) => b.score - a.score)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) {
      console.log('Using cached search results');
      return cached;
    }
    
    // Otherwise fetch from server
    const result = await ctx.fetch('/execute', {
      method: 'POST',
      body: JSON.stringify({ tool: 'search', input })
    });
    
    // Cache for future use
    ctx.cache.set(cacheKey, result.result);
    return result.result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">
        Search Results for &quot;{data.query}&quot;
      </h3>
      <div className="space-y-2">
        {data.results.map((result) => (
          <div key={result.id} className="p-3 border rounded hover:bg-gray-50">
            <h4 className="font-medium text-blue-600">{result.title}</h4>
            <p className="text-sm text-gray-600">{result.description}</p>
            <a 
              href={result.url} 
              className="text-xs text-gray-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {result.url}
            </a>
          </div>
        ))}
      </div>
    </div>
  ));

// Database tool with full optimization
export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional(),
    id: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    switch (input.operation) {
      case 'create':
        return { 
          success: true, 
          id: Math.random().toString(36).substr(2, 9),
          data: input.data 
        };
      case 'read':
        return { 
          success: true, 
          data: { id: input.id, ...input.data, table: input.table }
        };
      case 'update':
        return { 
          success: true, 
          id: input.id,
          updated: true 
        };
      case 'delete':
        return { 
          success: true, 
          id: input.id,
          deleted: true 
        };
      default:
        throw new Error('Invalid operation');
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Optimistic updates for UI
    const optimisticResult = {
      success: true,
      pending: true,
      ...input
    };
    
    // Return optimistic result immediately
    if (input.operation === 'create' || input.operation === 'update') {
      // Show optimistic UI update
      return optimisticResult;
    }
    
    // For read/delete, we need server response
    return ctx.fetch('/execute', {
      method: 'POST',
      body: JSON.stringify({ tool: 'database', input })
    }).then(res => res.result);
  })
  .render(({ data }) => (
    <div className={`p-3 rounded ${data.success ? 'bg-green-50' : 'bg-red-50'}`}>
      {data.pending && <span className="text-yellow-600">⏳ Pending...</span>}
      {data.success && !data.pending && (
        <span className="text-green-600">✓ Operation successful</span>
      )}
      {data.id && <p className="text-sm">ID: {data.id}</p>}
      {data.data && (
        <pre className="text-xs mt-2 p-2 bg-gray-100 rounded">
          {JSON.stringify(data.data, null, 2)}
        </pre>
      )}
    </div>
  ));

// Calculator tool - simple with no client optimization needed
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }))
  .execute(({ input }) => {
    const { operation, a, b } = input;
    let result: number;
    
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        result = a / b;
        break;
    }
    
    return { operation, a, b, result };
  })
  .render(({ data }) => (
    <div className="p-2 font-mono bg-gray-100 rounded">
      {data.a} {
        data.operation === 'add' ? '+' :
        data.operation === 'subtract' ? '-' :
        data.operation === 'multiply' ? '×' :
        '÷'
      } {data.b} = <span className="font-bold">{data.result}</span>
    </div>
  ));

// AI assistant tool with retry and caching
export const assistantTool = aui
  .tool('assistant')
  .input(z.object({
    message: z.string(),
    context: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate AI API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Randomly fail 20% of the time to test retry
    if (Math.random() < 0.2) {
      throw new Error('AI service temporarily unavailable');
    }
    
    return {
      response: `I understand you said: "${input.message}". Here's my response...`,
      confidence: Math.random(),
      context: input.context
    };
  })
  .render(({ data }) => (
    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
      <p className="text-gray-800">{data.response}</p>
      <p className="text-xs text-gray-500 mt-2">
        Confidence: {(data.confidence * 100).toFixed(1)}%
      </p>
    </div>
  ));

// Export all tools for easy registration
export const exampleTools = [
  weatherTool,
  searchTool,
  databaseTool,
  calculatorTool,
  assistantTool
];

// Helper to register all example tools
export function registerExampleTools() {
  // Tools are automatically registered when created with aui.tool()
  return aui;
}