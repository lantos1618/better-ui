import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Simple weather tool - just 2 methods
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex search tool - adds client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: Mock database search
    const results = [
      { id: 1, title: `Result for "${input.query}"`, content: 'Lorem ipsum...' },
      { id: 2, title: `Another match for "${input.query}"`, content: 'Dolor sit amet...' },
    ];
    return { query: input.query, results };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: Check cache first, then fetch
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    const response = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    });
    const data = await response.json();
    ctx.cache.set(cacheKey, data);
    return data;
  })
  .render(({ data }) => (
    <div className="search-results">
      <h3>Search Results for &quot;{data.query}&quot;</h3>
      {data.results.map((result: any) => (
        <div key={result.id} className="result-item">
          <h4>{result.title}</h4>
          <p>{result.content}</p>
        </div>
      ))}
    </div>
  ));

// Calculator tool - demonstrates middleware
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({ 
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }))
  .middleware(async ({ input, next }) => {
    console.log(`Calculating: ${input.a} ${input.operation} ${input.b}`);
    const result = await next();
    console.log(`Result: ${result}`);
    return result;
  })
  .execute(({ input }) => {
    const { operation, a, b } = input;
    switch (operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': return b !== 0 ? a / b : NaN;
      default: throw new Error(`Unknown operation: ${operation}`);
    }
  })
  .render(({ data, input }) => (
    <div className="calculator-result">
      {input?.a} {input?.operation} {input?.b} = {data}
    </div>
  ));

// Form submission tool
export const formTool = aui
  .tool('submitForm')
  .input(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    message: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, id: Math.random().toString(36).substr(2, 9), ...input };
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Submitting...</div>;
    if (error) return <div className="error">Error: {error.message}</div>;
    return (
      <div className="form-success">
        ✅ Form submitted successfully!
        <p>Submission ID: {data.id}</p>
        <p>Name: {data.name}</p>
        <p>Email: {data.email}</p>
        {data.message && <p>Message: {data.message}</p>}
      </div>
    );
  });

// Navigation tool - AI can control page navigation
export const navigationTool = aui
  .tool('navigate')
  .input(z.object({ 
    path: z.string(),
    params: z.record(z.string()).optional()
  }))
  .clientExecute(async ({ input }) => {
    const url = new URL(input.path, window.location.origin);
    if (input.params) {
      Object.entries(input.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    window.history.pushState({}, '', url.toString());
    return { navigated: true, url: url.toString() };
  })
  .render(({ data }) => (
    <div>Navigated to: {data.url}</div>
  ));

// State management tool - AI can control application state
export const stateTool = aui
  .tool('setState')
  .input(z.object({
    key: z.string(),
    value: z.any(),
    action: z.enum(['set', 'get', 'delete']).default('set')
  }))
  .clientExecute(({ input, ctx }) => {
    const stateMap = ctx.cache.get('appState') || new Map();
    
    switch (input.action) {
      case 'get':
        return { key: input.key, value: stateMap.get(input.key) };
      case 'delete':
        stateMap.delete(input.key);
        ctx.cache.set('appState', stateMap);
        return { key: input.key, deleted: true };
      case 'set':
      default:
        stateMap.set(input.key, input.value);
        ctx.cache.set('appState', stateMap);
        return { key: input.key, value: input.value, updated: true };
    }
  })
  .render(({ data }) => (
    <div className="state-update">
      {data.deleted ? `Deleted: ${data.key}` : 
       data.updated ? `Updated: ${data.key} = ${JSON.stringify(data.value)}` :
       `Retrieved: ${data.key} = ${JSON.stringify(data.value)}`}
    </div>
  ));