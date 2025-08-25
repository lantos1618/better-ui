'use client';

import aui from '@/lib/aui/lantos';
import { z } from 'zod';
import React from 'react';

// Simple tool - just 2 methods (execute and render are required)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    console.log('Server search for:', input.query);
    return {
      results: [
        { id: '1', title: `Result 1 for ${input.query}`, score: 0.95 },
        { id: '2', title: `Result 2 for ${input.query}`, score: 0.87 },
        { id: '3', title: `Result 3 for ${input.query}`, score: 0.76 }
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) {
      console.log('Using cached results for:', input.query);
      return cached;
    }
    
    const results = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    ctx.cache.set(cacheKey, results);
    return results;
  })
  .render(({ data }) => (
    <div className="search-results">
      <h3>Search Results</h3>
      <ul>
        {data.results.map((result: any) => (
          <li key={result.id}>
            <strong>{result.title}</strong> - Score: {result.score}
          </li>
        ))}
      </ul>
    </div>
  ));

// Calculator tool - minimal example
const calculator = aui
  .tool('calculator')
  .input(z.object({ 
    a: z.number(), 
    b: z.number(), 
    operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
  }))
  .execute(async ({ input }) => {
    const { a, b, operation } = input;
    let result: number;
    
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': result = b !== 0 ? a / b : NaN; break;
      default: result = NaN;
    }
    
    return { a, b, operation, result };
  })
  .render(({ data }) => (
    <div className="calculator-result">
      {data.a} {data.operation} {data.b} = <strong>{data.result}</strong>
    </div>
  ));

// User profile tool with client-side caching
const userProfile = aui
  .tool('userProfile')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database fetch
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id: input.userId,
      name: `User ${input.userId}`,
      email: `user${input.userId}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${input.userId}`,
      joinedDate: new Date('2024-01-15').toISOString()
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `user:${input.userId}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.data;
    }
    
    const data = await ctx.fetch(`/api/users/${input.userId}`);
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  })
  .render(({ data }) => (
    <div className="user-profile">
      <img src={data.avatar} alt={data.name} width={50} height={50} />
      <div>
        <h4>{data.name}</h4>
        <p>{data.email}</p>
        <small>Joined: {new Date(data.joinedDate).toLocaleDateString()}</small>
      </div>
    </div>
  ));

// File upload tool
const fileUpload = aui
  .tool('fileUpload')
  .input(z.object({ 
    file: z.instanceof(File),
    category: z.string().optional()
  }))
  .execute(async ({ input }) => {
    const formData = new FormData();
    formData.append('file', input.file);
    if (input.category) {
      formData.append('category', input.category);
    }
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      fileName: input.file.name,
      fileSize: input.file.size,
      fileType: input.file.type,
      uploadedAt: new Date().toISOString(),
      url: `https://example.com/uploads/${input.file.name}`
    };
  })
  .render(({ data }) => (
    <div className="file-upload-result">
      <h4>✅ Upload Successful</h4>
      <p>File: {data.fileName}</p>
      <p>Size: {(data.fileSize / 1024).toFixed(2)} KB</p>
      <p>Type: {data.fileType}</p>
      <a href={data.url} target="_blank" rel="noopener noreferrer">View File</a>
    </div>
  ));

// Demo component showing all tools in action
export function LantosAUIDemo() {
  const [weatherData, setWeatherData] = React.useState<any>(null);
  const [searchData, setSearchData] = React.useState<any>(null);
  const [calcData, setCalcData] = React.useState<any>(null);
  
  // Create a simple context for client execution
  const context = React.useMemo(() => ({
    cache: new Map(),
    fetch: async (url: string, options?: any) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });
      return response.json();
    }
  }), []);
  
  const handleWeatherClick = async () => {
    const result = await simpleTool.execute({ 
      input: { city: 'San Francisco' } 
    });
    setWeatherData(result);
  };
  
  const handleSearchClick = async () => {
    const result = await complexTool.execute({ 
      input: { query: 'AI tools' } 
    });
    setSearchData(result);
  };
  
  const handleCalcClick = async () => {
    const result = await calculator.execute({ 
      input: { a: 10, b: 5, operation: 'multiply' } 
    });
    setCalcData(result);
  };
  
  return (
    <div className="lantos-demo" style={{ padding: '20px' }}>
      <h1>Lantos AUI Demo</h1>
      
      <section style={{ marginBottom: '30px' }}>
        <h2>Simple Weather Tool</h2>
        <button onClick={handleWeatherClick}>Get Weather</button>
        {weatherData && simpleTool.render({ data: weatherData })}
      </section>
      
      <section style={{ marginBottom: '30px' }}>
        <h2>Complex Search Tool</h2>
        <button onClick={handleSearchClick}>Search</button>
        {searchData && complexTool.render({ data: searchData })}
      </section>
      
      <section style={{ marginBottom: '30px' }}>
        <h2>Calculator Tool</h2>
        <button onClick={handleCalcClick}>Calculate</button>
        {calcData && calculator.render({ data: calcData })}
      </section>
      
      <section>
        <h2>Registered Tools</h2>
        <p>Tools available: {aui.list().map(t => t.name).join(', ')}</p>
      </section>
    </div>
  );
}

// Export tools for use in other components
export { simpleTool, complexTool, calculator, userProfile, fileUpload };