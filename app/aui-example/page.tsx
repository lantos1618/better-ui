'use client';

import aui from '@/lib/aui';
import { z } from 'zod';
import { useState } from 'react';

const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    const response = await fetch(`/api/search?q=${input.query}`);
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const data = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    }).then(r => r.json());
    
    ctx.cache.set(input.query, data);
    return data;
  })
  .render(({ data }) => <SearchResults results={data} />);

const domControlTool = aui
  .tool('domControl')
  .input(z.object({
    action: z.enum(['click', 'type', 'scroll']),
    selector: z.string(),
    value: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    
    switch (input.action) {
      case 'click':
        (element as HTMLElement).click();
        break;
      case 'type':
        if (element instanceof HTMLInputElement) {
          element.value = input.value || '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      case 'scroll':
        element.scrollIntoView({ behavior: 'smooth' });
        break;
    }
    
    return { success: true, action: input.action };
  });

const dbTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['find', 'create', 'update', 'delete']),
    collection: z.string(),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .render(({ data }) => (
    <pre className="p-2 bg-gray-100 rounded">
      {JSON.stringify(data, null, 2)}
    </pre>
  ));

function SearchResults({ results }: { results: any }) {
  return (
    <div className="space-y-2">
      {results?.items?.map((item: any) => (
        <div key={item.id} className="p-2 border rounded">
          {item.title}
        </div>
      ))}
    </div>
  );
}

export default function AUIExample() {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [status, setStatus] = useState('');

  const runWeather = async () => {
    const result = await simpleTool.run({ city: 'San Francisco' });
    setWeatherData(result);
  };

  const runSearch = async () => {
    const result = await complexTool.run({ query: 'AI tools' });
    setSearchResults(result);
  };

  const controlDOM = async () => {
    setStatus('Controlling DOM...');
    await domControlTool.run({
      action: 'type',
      selector: '#search-input',
      value: 'Hello from AUI!'
    });
    setStatus('DOM controlled!');
  };

  const queryDB = async () => {
    const result = await dbTool.run({
      operation: 'find',
      collection: 'users',
      data: { active: true }
    });
    console.log('DB Result:', result);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">AUI Example - Concise Tool System</h1>
      
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Simple Tool - Weather</h2>
        <button 
          onClick={runWeather}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Get Weather
        </button>
        {weatherData && simpleTool.renderer && 
          simpleTool.renderer({ data: weatherData })}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Complex Tool - Search with Caching</h2>
        <button 
          onClick={runSearch}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Search
        </button>
        {searchResults && complexTool.renderer && 
          complexTool.renderer({ data: searchResults })}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">AI Control - Frontend</h2>
        <input 
          id="search-input" 
          type="text" 
          placeholder="AI will type here"
          className="px-3 py-2 border rounded w-full"
        />
        <button 
          onClick={controlDOM}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Control DOM
        </button>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">AI Control - Backend</h2>
        <button 
          onClick={queryDB}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Query Database
        </button>
      </section>

      <section className="mt-8 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Features:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Simple tools with just 2 methods: input() and execute()</li>
          <li>Complex tools add clientExecute() for caching/offline</li>
          <li>Optional render() method for UI components</li>
          <li>Full TypeScript support with Zod schemas</li>
          <li>AI can control both frontend (DOM) and backend (DB)</li>
          <li>Clean, concise API without build() methods</li>
        </ul>
      </section>
    </div>
  );
}