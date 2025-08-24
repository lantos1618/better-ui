'use client';

import React from 'react';
import { z } from 'zod';
import aui from '@/lib/aui';
import { useTool, useToolRenderer, useToolBatch } from '@/lib/aui/client/hooks';

// Define tools
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return { 
      city: input.city, 
      temp: Math.round(50 + Math.random() * 40),
      condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
    };
  })
  .render(({ data }) => (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="font-bold">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.condition}</p>
    </div>
  ))
  .build();

const stockTool = aui
  .tool('stock')
  .input(z.object({ ticker: z.string() }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      ticker: input.ticker,
      price: (100 + Math.random() * 900).toFixed(2),
      change: (Math.random() * 10 - 5).toFixed(2)
    };
  })
  .render(({ data }) => (
    <div className="p-3 border rounded bg-green-50">
      <span className="font-mono font-bold">{data.ticker}</span>
      <span className="ml-2">${data.price}</span>
      <span className={`ml-2 ${parseFloat(data.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {parseFloat(data.change) >= 0 ? '+' : ''}{data.change}%
      </span>
    </div>
  ))
  .build();

// Example 1: Basic useTool hook
export function WeatherWidget() {
  const [city, setCity] = React.useState('San Francisco');
  const { execute, loading, data, error } = useTool(weatherTool);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute({ city });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Weather Tool (useTool hook)</h2>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city"
          className="px-3 py-2 border rounded mr-2"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Weather'}
        </button>
      </form>

      {error && (
        <div className="text-red-500 mb-4">Error: {error}</div>
      )}

      {data && weatherTool.render && (
        weatherTool.render({ data, input: { city } })
      )}
    </div>
  );
}

// Example 2: useToolRenderer hook
export function StockTicker() {
  const [ticker, setTicker] = React.useState('AAPL');
  const { execute, render, loading, error } = useToolRenderer(stockTool);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await execute({ ticker });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Stock Tool (useToolRenderer hook)</h2>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter ticker"
          className="px-3 py-2 border rounded mr-2"
        />
        <button 
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Price'}
        </button>
      </form>

      {error && (
        <div className="text-red-500 mb-4">Error: {error}</div>
      )}

      {render({ ticker })}
    </div>
  );
}

// Example 3: Batch execution
export function DashboardWidget() {
  const { executeBatch, loading, results, errors } = useToolBatch();
  const [showResults, setShowResults] = React.useState(false);

  const loadDashboard = async () => {
    const toolCalls = [
      { id: '1', toolName: 'weather', input: { city: 'New York' } },
      { id: '2', toolName: 'weather', input: { city: 'London' } },
      { id: '3', toolName: 'stock', input: { ticker: 'AAPL' } },
      { id: '4', toolName: 'stock', input: { ticker: 'GOOGL' } },
    ];

    await executeBatch(toolCalls);
    setShowResults(true);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Dashboard (useToolBatch hook)</h2>
      
      <button
        onClick={loadDashboard}
        disabled={loading}
        className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50 mb-4"
      >
        {loading ? 'Loading Dashboard...' : 'Load Dashboard Data'}
      </button>

      {errors.length > 0 && (
        <div className="text-red-500 mb-4">
          Errors: {errors.join(', ')}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {results.map((result) => (
            <div key={result.id} className="p-3 border rounded">
              <div className="text-sm text-gray-600 mb-1">
                Tool: {result.toolName}
              </div>
              {result.error ? (
                <div className="text-red-500">Error: {result.error}</div>
              ) : (
                <pre className="text-xs">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main demo component
export default function AUIHooksDemo() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">AUI Hooks Demo</h1>
      
      <div className="space-y-8">
        <WeatherWidget />
        <StockTicker />
        <DashboardWidget />
      </div>
    </div>
  );
}