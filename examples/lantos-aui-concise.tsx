'use client';

import aui from '@/lib/aui/lantos-concise';
import { z } from 'zod';
import React from 'react';

// Simple tool - just 2 methods (your exact example)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization (your exact example)
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: database search
    return { results: [`Server result for: ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="search-results">
      {data.results?.map((r: string, i: number) => (
        <div key={i}>{r}</div>
      ))}
    </div>
  ));

// More examples showing the power of the API
const calculator = aui
  .tool('calculator')
  .input(z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }))
  .execute(async ({ input }) => {
    const ops = {
      '+': (a: number, b: number) => a + b,
      '-': (a: number, b: number) => a - b,
      '*': (a: number, b: number) => a * b,
      '/': (a: number, b: number) => a / b,
    };
    return { result: ops[input.op](input.a, input.b) };
  })
  .render(({ data }) => <span>{data.result}</span>);

const userProfile = aui
  .tool('userProfile')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => {
    // Simulate API call
    return { 
      id: input.userId, 
      name: 'John Doe',
      email: 'john@example.com'
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `user:${input.userId}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    const user = await ctx.fetch(`/api/users/${input.userId}`).then(r => r.json());
    ctx.cache.set(cacheKey, user);
    return user;
  })
  .render(({ data }) => (
    <div className="user-profile">
      <h3>{data.name}</h3>
      <p>{data.email}</p>
    </div>
  ));

// Register tools for global access
aui.set(simpleTool);
aui.set(complexTool);
aui.set(calculator);
aui.set(userProfile);

// Demo component
export default function LantosAUIConciseDemo() {
  const [weatherData, setWeatherData] = React.useState<any>(null);
  const [searchData, setSearchData] = React.useState<any>(null);
  const [calcData, setCalcData] = React.useState<any>(null);
  const [userData, setUserData] = React.useState<any>(null);

  const runExamples = async () => {
    // Run simple tool
    const weather = await simpleTool.run({ city: 'San Francisco' });
    setWeatherData(weather);

    // Run complex tool with caching
    const search = await complexTool.run({ query: 'Next.js AUI' });
    setSearchData(search);

    // Run calculator
    const calc = await calculator.run({ a: 10, b: 5, op: '+' });
    setCalcData(calc);

    // Run user profile with client-side caching
    const user = await userProfile.run({ userId: '123' });
    setUserData(user);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Lantos AUI - Concise API</h1>
      
      <button 
        onClick={runExamples}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-6"
      >
        Run All Examples
      </button>

      <div className="space-y-6">
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Simple Tool - Weather</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm mb-4">
{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}
          </pre>
          {weatherData && simpleTool.render({ data: weatherData })}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Complex Tool - Search with Client Caching</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm mb-4">
{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}
          </pre>
          {searchData && complexTool.render({ data: searchData })}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Calculator</h2>
          {calcData && (
            <div>Result: {calculator.render({ data: calcData })}</div>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">User Profile</h2>
          {userData && userProfile.render({ data: userData })}
        </div>
      </div>
    </div>
  );
}