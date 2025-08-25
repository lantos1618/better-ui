import React from 'react';
import aui, { z } from '../index';

// Simple tool - just 2 methods
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: database search
    const results = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input.query })
    }).then(r => r.json());
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: with caching
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    const results = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(cacheKey, results);
    return results;
  })
  .render(({ data }) => (
    <div className="search-results">
      {data?.results?.map((item: any, i: number) => (
        <div key={i} className="search-item">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  ));

// Calculator tool
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({
    expression: z.string(),
    precision: z.number().optional().default(2)
  }))
  .execute(async ({ input }) => {
    // Safe math evaluation
    const result = Function(`"use strict"; return (${input.expression})`)();
    return {
      expression: input.expression,
      result: Number(result.toFixed(input.precision))
    };
  })
  .render(({ data }) => (
    <div className="calculator-result">
      <code>{data.expression}</code> = <strong>{data.result}</strong>
    </div>
  ));

// Data fetcher tool with streaming support
export const dataFetcherTool = aui
  .tool('dataFetcher')
  .input(z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST']).default('GET'),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    const response = await fetch(input.url, {
      method: input.method,
      body: input.body ? JSON.stringify(input.body) : undefined,
      headers: input.body ? { 'Content-Type': 'application/json' } : undefined
    });
    return await response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `fetch:${input.method}:${input.url}`;
    if (input.method === 'GET') {
      const cached = ctx.cache.get(cacheKey);
      if (cached) return cached;
    }
    
    const data = await ctx.fetch(input.url, {
      method: input.method,
      body: input.body ? JSON.stringify(input.body) : undefined,
      headers: input.body ? { 'Content-Type': 'application/json' } : undefined
    }).then(r => r.json());
    
    if (input.method === 'GET') {
      ctx.cache.set(cacheKey, data);
    }
    return data;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  });

// Form handler tool
export const formTool = aui
  .tool('form')
  .input(z.object({
    formData: z.record(z.any()),
    endpoint: z.string()
  }))
  .execute(async ({ input }) => {
    const response = await fetch(input.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.formData)
    });
    return {
      success: response.ok,
      status: response.status,
      data: await response.json()
    };
  })
  .render(({ data }) => (
    <div className={`form-result ${data.success ? 'success' : 'error'}`}>
      {data.success ? '✓ Form submitted successfully' : `✗ Error: ${data.status}`}
      {data.data && <pre>{JSON.stringify(data.data, null, 2)}</pre>}
    </div>
  ));

// Database query tool
export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['find', 'create', 'update', 'delete']),
    collection: z.string(),
    query: z.any().optional(),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // This would connect to your actual database
    const endpoint = `/api/db/${input.collection}/${input.operation}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input.query, data: input.data })
    });
    return await response.json();
  })
  .render(({ data }) => (
    <div className="db-result">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));