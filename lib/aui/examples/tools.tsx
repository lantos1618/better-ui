import React from 'react';
import aui, { z } from '../index';

// Simple weather tool - minimal setup
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({
    temp: Math.floor(60 + Math.random() * 30),
    city: input.city,
    conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.conditions}</p>
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
    // Server-side execution - would hit database
    const results = Array.from({ length: input.limit || 10 }, (_, i) => ({
      id: `result-${i}`,
      title: `Result ${i + 1} for "${input.query}"`,
      description: `This is a mock result for the search query "${input.query}"`,
      relevance: Math.random()
    }));
    return results.sort((a: any, b: any) => b.relevance - a.relevance);
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side execution with caching
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) {
      console.log('Returning cached results for:', input.query);
      return cached;
    }
    
    // Fetch from API endpoint
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const results = await response.json();
    ctx.cache.set(cacheKey, results);
    
    return results;
  })
  .render(({ data, input, loading, error }) => {
    if (loading) return <div className="p-4">Searching for &quot;{input?.query}&quot;...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;
    
    return (
      <div className="space-y-2">
        <h3 className="font-semibold">Search Results for &quot;{input?.query}&quot;</h3>
        {data.map((result: any) => (
          <div key={result.id} className="p-3 border rounded hover:bg-gray-50">
            <h4 className="font-medium">{result.title}</h4>
            <p className="text-sm text-gray-600">{result.description}</p>
            <span className="text-xs text-gray-400">
              Relevance: {(result.relevance * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    );
  });

// Calculator tool - pure function, no client execution needed
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({
    expression: z.string(),
    precision: z.number().optional().default(2)
  }))
  .execute(async ({ input }) => {
    // Simple safe math evaluation (in production use math.js or similar)
    const result = Function('"use strict"; return (' + input.expression + ')')();
    return {
      expression: input.expression,
      result: Number(result.toFixed(input.precision))
    };
  })
  .render(({ data }) => (
    <div className="p-3 bg-gray-100 rounded font-mono">
      {data.expression} = <span className="font-bold">{data.result}</span>
    </div>
  ));

// User profile tool with session context
export const userProfileTool = aui
  .tool('userProfile')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input, ctx }) => {
    // Check if user is viewing their own profile
    const isOwnProfile = ctx?.user?.id === input.userId;
    
    // Mock user data
    return {
      id: input.userId,
      name: isOwnProfile ? ctx?.user?.name : `User ${input.userId}`,
      email: isOwnProfile ? ctx?.user?.email : `user${input.userId}@example.com`,
      isOwnProfile,
      private: !isOwnProfile
    };
  })
  .render(({ data }) => (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold text-lg">{data.name}</h3>
      {!data.private && <p className="text-gray-600">{data.email}</p>}
      {data.isOwnProfile && (
        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
          Your Profile
        </span>
      )}
    </div>
  ));

// Data visualization tool
export const chartTool = aui
  .tool('chart')
  .input(z.object({
    data: z.array(z.object({
      label: z.string(),
      value: z.number()
    })),
    type: z.enum(['bar', 'line', 'pie']).optional().default('bar')
  }))
  .execute(async ({ input }) => {
    const max = Math.max(...input.data.map(d => d.value));
    return {
      ...input,
      max,
      normalized: input.data.map(d => ({
        ...d,
        percentage: (d.value / max) * 100
      }))
    };
  })
  .render(({ data }) => (
    <div className="p-4 border rounded-lg">
      <h4 className="font-semibold mb-2">Chart ({data.type})</h4>
      <div className="space-y-2">
        {data.normalized.map((item: any) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-20 text-sm">{item.label}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div 
                className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                style={{ width: `${item.percentage}%` }}
              >
                <span className="text-xs text-white">{item.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ));

// Form submission tool
export const formTool = aui
  .tool('form')
  .input(z.object({
    action: z.enum(['submit', 'validate', 'save']),
    formData: z.record(z.any())
  }))
  .execute(async ({ input }) => {
    switch (input.action) {
      case 'validate':
        const errors: Record<string, string> = {};
        if (!input.formData.email?.includes('@')) {
          errors.email = 'Invalid email';
        }
        return { valid: Object.keys(errors).length === 0, errors };
      
      case 'save':
        return { saved: true, timestamp: new Date().toISOString() };
      
      case 'submit':
        return { 
          submitted: true, 
          id: Math.random().toString(36).substr(2, 9),
          data: input.formData 
        };
      
      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side optimistic update
    if (input.action === 'save') {
      ctx.cache.set('draft', input.formData);
      return { saved: true, timestamp: new Date().toISOString(), cached: true };
    }
    
    // For submit, still go to server
    const response = await ctx.fetch('/api/tools/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    return response.json();
  })
  .render(({ data, input }) => (
    <div className="p-3 rounded border">
      {data.saved && (
        <p className="text-green-600">
          ✓ {'cached' in data && data.cached ? 'Cached locally' : 'Saved'} at {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      )}
      {data.submitted && (
        <p className="text-blue-600">✓ Submitted with ID: {data.id}</p>
      )}
      {data.errors && Object.keys(data.errors).length > 0 && (
        <div className="text-red-600">
          {Object.entries(data.errors).map(([field, error]) => (
            <p key={field}>{field}: {error}</p>
          ))}
        </div>
      )}
    </div>
  ));

// Export all tools for easy access
export const tools = {
  weather: weatherTool,
  search: searchTool,
  calculator: calculatorTool,
  userProfile: userProfileTool,
  chart: chartTool,
  form: formTool
};

export default tools;