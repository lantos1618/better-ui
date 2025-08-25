'use client';

import { useState } from 'react';
import { AUIProvider, useAUITool } from '@/lib/aui';
import { weatherTool, searchTool, calculatorTool, formTool } from '@/lib/aui/examples/simple-tools';

function WeatherWidget() {
  const [city, setCity] = useState('San Francisco');
  const { execute, data, loading, error } = useAUITool(weatherTool);

  return (
    <div className="border p-4 rounded-lg">
      <h3 className="font-bold mb-2">Weather Tool</h3>
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="border px-2 py-1 rounded mr-2"
        placeholder="Enter city"
      />
      <button
        onClick={() => execute({ city })}
        className="bg-blue-500 text-white px-4 py-1 rounded"
      >
        Get Weather
      </button>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {data && weatherTool.renderer && weatherTool.renderer({ data, loading: false })}
    </div>
  );
}

function SearchWidget() {
  const [query, setQuery] = useState('');
  const { execute, data, loading } = useAUITool(searchTool);

  return (
    <div className="border p-4 rounded-lg">
      <h3 className="font-bold mb-2">Search Tool (with caching)</h3>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border px-2 py-1 rounded mr-2"
        placeholder="Search query"
      />
      <button
        onClick={() => execute({ query })}
        className="bg-green-500 text-white px-4 py-1 rounded"
      >
        Search
      </button>
      {loading && <p>Searching...</p>}
      {data && searchTool.renderer && searchTool.renderer({ data, loading: false })}
    </div>
  );
}

function CalculatorWidget() {
  const [a, setA] = useState(10);
  const [b, setB] = useState(5);
  const [operation, setOperation] = useState<'add' | 'subtract' | 'multiply' | 'divide'>('add');
  const { execute, data } = useAUITool(calculatorTool);

  return (
    <div className="border p-4 rounded-lg">
      <h3 className="font-bold mb-2">Calculator Tool</h3>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={a}
          onChange={(e) => setA(Number(e.target.value))}
          className="border px-2 py-1 rounded w-20"
        />
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value as any)}
          className="border px-2 py-1 rounded"
        >
          <option value="add">+</option>
          <option value="subtract">-</option>
          <option value="multiply">×</option>
          <option value="divide">÷</option>
        </select>
        <input
          type="number"
          value={b}
          onChange={(e) => setB(Number(e.target.value))}
          className="border px-2 py-1 rounded w-20"
        />
        <button
          onClick={() => execute({ operation, a, b })}
          className="bg-purple-500 text-white px-4 py-1 rounded"
        >
          Calculate
        </button>
      </div>
      {data !== undefined && data !== null && calculatorTool.renderer && 
        calculatorTool.renderer({ data, input: { operation, a, b }, loading: false })}
    </div>
  );
}

function FormWidget() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const { execute, data, loading, error } = useAUITool(formTool);

  return (
    <div className="border p-4 rounded-lg">
      <h3 className="font-bold mb-2">Form Tool</h3>
      <div className="space-y-2">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="border px-2 py-1 rounded w-full"
          placeholder="Name"
        />
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="border px-2 py-1 rounded w-full"
          placeholder="Email"
        />
        <textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="border px-2 py-1 rounded w-full"
          placeholder="Message (optional)"
        />
        <button
          onClick={() => execute(formData)}
          className="bg-indigo-500 text-white px-4 py-2 rounded"
        >
          Submit Form
        </button>
      </div>
      {(loading || error || data) && formTool.renderer && 
        formTool.renderer({ data: data!, loading, error: error || undefined })}
    </div>
  );
}

export default function AUIDemoPage() {
  return (
    <AUIProvider>
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">AUI (Assistant-UI) System Demo</h1>
        <p className="mb-8 text-gray-600">
          Clean, concise API for AI-controlled tools in Next.js. Each tool can have server 
          and client execution, with automatic caching and rendering.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WeatherWidget />
          <SearchWidget />
          <CalculatorWidget />
          <FormWidget />
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">How it works:</h2>
          <pre className="text-sm overflow-x-auto">
{`// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}
          </pre>
        </div>
      </div>
    </AUIProvider>
  );
}