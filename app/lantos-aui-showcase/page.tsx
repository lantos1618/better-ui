'use client';

import React, { useState } from 'react';
import { AUIProvider, useTool, ToolRenderer } from '@/lib/aui/lantos/client';
import { tools } from '@/lib/aui/lantos/examples';

function WeatherDemo() {
  const [city, setCity] = useState('San Francisco');
  const { execute, loading, data, error } = useTool(tools.weather);

  return (
    <div className="demo-section">
      <h2>Weather Tool Demo</h2>
      <div className="demo-controls">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city name"
        />
        <button onClick={() => execute({ city })}>Get Weather</button>
      </div>
      <ToolRenderer 
        tool={tools.weather}
        input={{ city }}
        autoExecute={false}
      />
      {data && !loading && (
        <div className="result">
          <h3>{data.city}</h3>
          <p>{data.temp}°F - {data.conditions}</p>
        </div>
      )}
    </div>
  );
}

function SearchDemo() {
  const [query, setQuery] = useState('');
  const { execute, loading, data } = useTool(tools.search, { 
    cache: true,
    debounce: 500 
  });

  return (
    <div className="demo-section">
      <h2>Search Tool Demo (with caching & debounce)</h2>
      <div className="demo-controls">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) {
              execute({ query: e.target.value, limit: 5 });
            }
          }}
          placeholder="Search..."
        />
      </div>
      {loading && <p>Searching...</p>}
      {data && (
        <div className="results">
          <p>Found {data.total} results</p>
          {data.results.map(r => (
            <div key={r.id} className="result-item">
              <h4>{r.title}</h4>
              <p>{r.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DatabaseDemo() {
  const { execute, loading, data } = useTool(tools.database);
  const [operation, setOperation] = useState<'read' | 'write' | 'delete'>('read');
  
  return (
    <div className="demo-section">
      <h2>Database Tool Demo</h2>
      <div className="demo-controls">
        <select value={operation} onChange={(e) => setOperation(e.target.value as any)}>
          <option value="read">Read</option>
          <option value="write">Write</option>
          <option value="delete">Delete</option>
        </select>
        <button onClick={() => execute({ 
          operation, 
          table: 'users',
          id: operation !== 'write' ? '123' : undefined,
          data: operation === 'write' ? { name: 'Test User' } : undefined
        })}>
          Execute
        </button>
      </div>
      {loading && <p>Processing...</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

export default function LantosAUIShowcasePage() {
  return (
    <AUIProvider>
      <div className="container">
        <h1>Lantos AUI - Concise Tool API Showcase</h1>
        
        <div className="code-example">
          <h2>Simple Tool Example</h2>
          <pre>{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}</pre>
        </div>

        <div className="code-example">
          <h2>Complex Tool with Client Optimization</h2>
          <pre>{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}</pre>
        </div>

        <div className="demos">
          <WeatherDemo />
          <SearchDemo />
          <DatabaseDemo />
        </div>

        <style jsx>{`
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
          }
          
          h1 {
            color: #333;
            margin-bottom: 2rem;
          }
          
          .code-example {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 2rem;
          }
          
          .code-example h2 {
            margin-top: 0;
            color: #666;
          }
          
          pre {
            background: #282c34;
            color: #abb2bf;
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
          }
          
          .demos {
            display: grid;
            gap: 2rem;
          }
          
          .demo-section {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 1.5rem;
          }
          
          .demo-section h2 {
            margin-top: 0;
            color: #333;
          }
          
          .demo-controls {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
          }
          
          input, select {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
          }
          
          button {
            padding: 0.5rem 1rem;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
          }
          
          button:hover {
            background: #0056b3;
          }
          
          .result, .results {
            margin-top: 1rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 4px;
          }
          
          .result-item {
            padding: 0.5rem;
            border-bottom: 1px solid #dee2e6;
          }
          
          .result-item:last-child {
            border-bottom: none;
          }
        `}</style>
      </div>
    </AUIProvider>
  );
}