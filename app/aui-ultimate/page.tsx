'use client';

import React, { useState } from 'react';
import aui, { z } from '@/lib/aui';
import { aiControl } from '@/lib/aui/ai-control';

// Define all our tools
const tools = {
  // Simple weather tool
  weather: aui
    .tool('weather')
    .input(z.object({ city: z.string() }))
    .execute(async ({ input }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        temp: Math.floor(Math.random() * 30) + 60,
        city: input.city,
        conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
      };
    })
    .render(({ data }) => (
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold">{data.city}</h3>
        <p className="text-2xl">{data.temp}°F</p>
        <p className="text-gray-600">{data.conditions}</p>
      </div>
    ))
    .build(),

  // Calculator tool
  calc: aui.do('calculator', {
    input: z.object({
      a: z.number(),
      b: z.number(),
      op: z.enum(['+', '-', '*', '/']),
    }),
    execute: async (input) => {
      switch (input.op) {
        case '+': return input.a + input.b;
        case '-': return input.a - input.b;
        case '*': return input.a * input.b;
        case '/': return input.a / input.b;
        default: return 0;
      }
    },
    render: (result) => (
      <div className="p-4 bg-green-50 rounded-lg">
        <p className="text-xl font-mono">Result: {result}</p>
      </div>
    ),
  }),

  // Text transformer
  text: aui.simple(
    'text-transform',
    z.object({
      text: z.string(),
      transform: z.enum(['upper', 'lower', 'reverse', 'length']),
    }),
    (input) => {
      switch (input.transform) {
        case 'upper': return input.text.toUpperCase();
        case 'lower': return input.text.toLowerCase();
        case 'reverse': return input.text.split('').reverse().join('');
        case 'length': return `Length: ${input.text.length}`;
        default: return input.text;
      }
    },
    (result) => (
      <div className="p-4 bg-purple-50 rounded-lg">
        <p className="font-mono">{result}</p>
      </div>
    )
  ),
};

export default function AUIUltimatePage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const executeWeather = async () => {
    setLoading(prev => ({ ...prev, weather: true }));
    try {
      const result = await tools.weather.execute({
        input: { city: 'San Francisco' }
      });
      setResults(prev => ({ ...prev, weather: result }));
    } finally {
      setLoading(prev => ({ ...prev, weather: false }));
    }
  };

  const executeCalc = async () => {
    setLoading(prev => ({ ...prev, calc: true }));
    try {
      const result = await tools.calc.execute({
        input: { a: 10, b: 5, op: '+' }
      });
      setResults(prev => ({ ...prev, calc: result }));
    } finally {
      setLoading(prev => ({ ...prev, calc: false }));
    }
  };

  const executeText = async () => {
    setLoading(prev => ({ ...prev, text: true }));
    try {
      const result = await tools.text.execute({
        input: { text: 'Hello AUI', transform: 'upper' }
      });
      setResults(prev => ({ ...prev, text: result }));
    } finally {
      setLoading(prev => ({ ...prev, text: false }));
    }
  };

  const executeUIControl = async () => {
    setLoading(prev => ({ ...prev, ui: true }));
    try {
      // Change theme
      await aiControl.ui.execute({
        input: { action: 'theme', value: 'dark' }
      });
      
      // Show toast
      await aiControl.ui.execute({
        input: { 
          action: 'toast', 
          value: 'Theme changed!',
          options: { type: 'success' }
        }
      });
      
      setResults(prev => ({ ...prev, ui: 'UI controls executed!' }));
    } finally {
      setLoading(prev => ({ ...prev, ui: false }));
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">AUI Ultimate Demo</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Ultra-Concise Tool API</h2>
        <p className="text-gray-600 mb-6">
          AUI provides the most concise API for creating AI tools that can control both frontend and backend.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weather Tool */}
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Weather Tool</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm mb-4">
{`aui.tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => fetchWeather(input.city))
  .render(({ data }) => <WeatherCard {...data} />)
  .build()`}
          </pre>
          <button
            onClick={executeWeather}
            disabled={loading.weather}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
          >
            {loading.weather ? 'Loading...' : 'Check Weather'}
          </button>
          {results.weather && tools.weather.render({ 
            data: results.weather,
            input: { city: 'San Francisco' }
          })}
        </div>

        {/* Calculator Tool */}
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Calculator Tool</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm mb-4">
{`aui.do('calculator', {
  input: z.object({ a: z.number(), b: z.number(), op: z.enum(['+','-','*','/']) }),
  execute: async (input) => calculate(input),
  render: (result) => <Result value={result} />
})`}
          </pre>
          <button
            onClick={executeCalc}
            disabled={loading.calc}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 mb-4"
          >
            {loading.calc ? 'Calculating...' : 'Calculate 10 + 5'}
          </button>
          {results.calc !== undefined && tools.calc.render({ 
            data: results.calc,
            input: { a: 10, b: 5, op: '+' }
          })}
        </div>

        {/* Text Transform Tool */}
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Text Transform Tool</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm mb-4">
{`aui.simple(
  'text-transform',
  z.object({ text: z.string(), transform: z.enum(['upper','lower','reverse']) }),
  (input) => transformText(input),
  (result) => <TextResult>{result}</TextResult>
)`}
          </pre>
          <button
            onClick={executeText}
            disabled={loading.text}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 mb-4"
          >
            {loading.text ? 'Transforming...' : 'Transform Text'}
          </button>
          {results.text && tools.text.render({ 
            data: results.text,
            input: { text: 'Hello AUI', transform: 'upper' }
          })}
        </div>

        {/* AI UI Control */}
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">AI UI Control</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm mb-4">
{`aiControl.ui
  .execute({ 
    input: { 
      action: 'theme', 
      value: 'dark' 
    }
  })`}
          </pre>
          <button
            onClick={executeUIControl}
            disabled={loading.ui}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 mb-4"
          >
            {loading.ui ? 'Executing...' : 'Control UI'}
          </button>
          {results.ui && (
            <div className="p-4 bg-red-50 rounded-lg">
              <p>{results.ui}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">🚀 Ultra-Concise API</h3>
            <p className="text-sm text-gray-600">
              Just 2 methods minimum: input() and execute()
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">🤖 AI-Optimized</h3>
            <p className="text-sm text-gray-600">
              Built-in retry, caching, and streaming support
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">🎮 Full Control</h3>
            <p className="text-sm text-gray-600">
              AI can control both frontend UI and backend operations
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">🔒 Type-Safe</h3>
            <p className="text-sm text-gray-600">
              Full TypeScript support with Zod schemas
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">⚡ Client/Server</h3>
            <p className="text-sm text-gray-600">
              Seamless execution on both client and server
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">🎨 React Components</h3>
            <p className="text-sm text-gray-600">
              Built-in rendering with React components
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Usage Patterns</h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">Simple Tool (2 methods)</h3>
            <pre className="text-sm">
{`aui.tool('name')
  .input(schema)
  .execute(handler)
  .build()`}
            </pre>
          </div>
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-semibold mb-2">With Client Optimization</h3>
            <pre className="text-sm">
{`aui.tool('name')
  .input(schema)
  .execute(serverHandler)
  .clientExecute(clientHandler)
  .render(component)
  .build()`}
            </pre>
          </div>
          <div className="p-4 bg-purple-50 rounded">
            <h3 className="font-semibold mb-2">One-Liner</h3>
            <pre className="text-sm">
{`aui.do('name', async (input) => processInput(input))`}
            </pre>
          </div>
          <div className="p-4 bg-red-50 rounded">
            <h3 className="font-semibold mb-2">AI-Optimized</h3>
            <pre className="text-sm">
{`aui.ai('name', {
  input: schema,
  execute: handler,
  retry: 3,
  cache: true
})`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}