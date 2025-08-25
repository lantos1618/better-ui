import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Simple weather tool - just execute and render
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city,
    condition: 'sunny'
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-semibold">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.condition}</p>
    </div>
  ));

// Complex search tool with client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side database search
    const results = await simulateDBSearch(input.query, input.limit || 10);
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching and optimization
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
    
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Searching...</div>;
    if (error) return <div>Error: {error.message}</div>;
    
    return (
      <div className="space-y-2">
        {data.map((item: any) => (
          <div key={item.id} className="p-3 border rounded">
            <h4 className="font-medium">{item.title}</h4>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    );
  });

// Calculator tool with validation
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({
    expression: z.string().regex(/^[\d\s+\-*/().]+$/, 'Invalid expression')
  }))
  .execute(async ({ input }) => {
    try {
      // Safe evaluation for simple math expressions
      const result = evaluateExpression(input.expression);
      return { 
        expression: input.expression, 
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Invalid calculation');
    }
  })
  .render(({ data }) => (
    <div className="p-3 bg-gray-100 rounded font-mono">
      <div className="text-sm text-gray-600">{data.expression}</div>
      <div className="text-xl font-bold">= {data.result}</div>
    </div>
  ));

// Form submission tool with middleware
export const formTool = aui
  .tool('form')
  .input(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    message: z.string().min(10)
  }))
  .middleware(async ({ input, ctx, next }) => {
    // Add timestamp and user info
    const enrichedInput = {
      ...input,
      timestamp: Date.now(),
      userAgent: typeof ctx.headers === 'object' && ctx.headers && 'user-agent' in ctx.headers 
        ? (ctx.headers as any)['user-agent'] 
        : undefined
    };
    return next();
  })
  .execute(async ({ input }) => {
    // Save to database
    const id = Math.random().toString(36).substr(2, 9);
    return { 
      success: true, 
      id,
      message: `Thank you ${input.name}, we'll respond to ${input.email} soon!`
    };
  })
  .render(({ data, loading }) => {
    if (loading) return <div>Submitting...</div>;
    
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <p className="text-green-800">{data.message}</p>
        <p className="text-sm text-gray-600 mt-2">Reference: {data.id}</p>
      </div>
    );
  });

// Analytics tool with complex visualization
export const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    metric: z.enum(['views', 'clicks', 'conversions']),
    period: z.enum(['day', 'week', 'month']),
    groupBy: z.enum(['hour', 'day', 'week']).optional()
  }))
  .execute(async ({ input }) => {
    const data = generateAnalyticsData(input);
    return {
      metric: input.metric,
      period: input.period,
      data,
      summary: calculateSummary(data)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Use cached data if available for expensive queries
    const cacheKey = `analytics:${JSON.stringify(input)}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
      return cached.data;
    }
    
    const response = await ctx.fetch('/api/tools/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  })
  .render(({ data }) => (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold capitalize">
          {data.metric} - {data.period}
        </h3>
        <div className="grid grid-cols-3 gap-4 mt-2">
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-xl font-bold">{data.summary.total}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average</p>
            <p className="text-xl font-bold">{data.summary.average}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Peak</p>
            <p className="text-xl font-bold">{data.summary.peak}</p>
          </div>
        </div>
      </div>
      <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
        [Chart visualization would go here]
      </div>
    </div>
  ));

// Helper functions
async function simulateDBSearch(query: string, limit: number) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
    id: `result-${i}`,
    title: `${query} result ${i + 1}`,
    description: `This is a search result for "${query}"`
  }));
}

function evaluateExpression(expr: string): number {
  // Simple safe math evaluation (production would use a proper parser)
  const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '');
  try {
    // This is a simplified version - use a proper math parser in production
    const result = Function(`"use strict"; return (${sanitized})`)();
    return Number(result.toFixed(2));
  } catch {
    throw new Error('Invalid expression');
  }
}

function generateAnalyticsData(input: any) {
  const points = input.period === 'day' ? 24 : input.period === 'week' ? 7 : 30;
  return Array.from({ length: points }, (_, i) => ({
    label: `Point ${i + 1}`,
    value: Math.floor(Math.random() * 1000) + 100
  }));
}

function calculateSummary(data: any[]) {
  const values = data.map(d => d.value);
  return {
    total: values.reduce((a, b) => a + b, 0),
    average: Math.floor(values.reduce((a, b) => a + b, 0) / values.length),
    peak: Math.max(...values)
  };
}

// Export all tools
export const tools = {
  weather: weatherTool,
  search: searchTool,
  calculator: calculatorTool,
  form: formTool,
  analytics: analyticsTool
};