'use client';

import { useState } from 'react';
import { AUIProvider } from '@/lib/aui/client/provider';
import { useAUITool } from '@/lib/aui/client/hooks';
import { 
  weatherTool, 
  searchTool, 
  databaseTool,
  calculatorTool,
  assistantTool,
  registerExampleTools
} from '@/lib/aui/tools/examples';

// Register all tools on module load
if (typeof window !== 'undefined') {
  registerExampleTools();
}

function WeatherDemo() {
  const [city, setCity] = useState('San Francisco');
  const tool = useAUITool(weatherTool, { cache: true });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Weather Tool (Simple)</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-3 py-2 border rounded"
          placeholder="Enter city"
        />
        <button
          onClick={() => tool.execute({ city })}
          disabled={tool.loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {tool.loading ? 'Loading...' : 'Get Weather'}
        </button>
      </div>
      {tool.error && (
        <div className="text-red-500">Error: {tool.error.message}</div>
      )}
      {tool.render && tool.render()}
    </div>
  );
}

function SearchDemo() {
  const [query, setQuery] = useState('');
  const tool = useAUITool(searchTool, { 
    cache: true,
    debounce: 500,
    onSuccess: (data) => console.log('Search completed:', data)
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Search Tool (Complex with caching)</h3>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value) {
            tool.execute({ query: e.target.value, limit: 5 });
          }
        }}
        className="w-full px-3 py-2 border rounded"
        placeholder="Type to search (debounced)..."
      />
      {tool.loading && <div className="text-gray-500">Searching...</div>}
      {tool.render && tool.render()}
    </div>
  );
}

function DatabaseDemo() {
  const tool = useAUITool(databaseTool);
  const [formData, setFormData] = useState({
    operation: 'create' as const,
    table: 'users',
    data: { name: 'John Doe', email: 'john@example.com' }
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Database Tool (Optimistic Updates)</h3>
      <div className="space-y-2">
        <select
          value={formData.operation}
          onChange={(e) => setFormData({ ...formData, operation: e.target.value as any })}
          className="px-3 py-2 border rounded"
        >
          <option value="create">Create</option>
          <option value="read">Read</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
        <input
          type="text"
          value={formData.table}
          onChange={(e) => setFormData({ ...formData, table: e.target.value })}
          className="px-3 py-2 border rounded"
          placeholder="Table name"
        />
        <button
          onClick={() => tool.execute(formData)}
          disabled={tool.loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Execute Operation
        </button>
      </div>
      {tool.render && tool.render()}
    </div>
  );
}

function CalculatorDemo() {
  const tool = useAUITool(calculatorTool);
  const [calc, setCalc] = useState({
    operation: 'add' as const,
    a: 10,
    b: 5
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Calculator Tool (Instant)</h3>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={calc.a}
          onChange={(e) => setCalc({ ...calc, a: Number(e.target.value) })}
          className="w-20 px-2 py-1 border rounded"
        />
        <select
          value={calc.operation}
          onChange={(e) => setCalc({ ...calc, operation: e.target.value as any })}
          className="px-2 py-1 border rounded"
        >
          <option value="add">+</option>
          <option value="subtract">-</option>
          <option value="multiply">×</option>
          <option value="divide">÷</option>
        </select>
        <input
          type="number"
          value={calc.b}
          onChange={(e) => setCalc({ ...calc, b: Number(e.target.value) })}
          className="w-20 px-2 py-1 border rounded"
        />
        <button
          onClick={() => tool.execute(calc)}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          =
        </button>
      </div>
      {tool.render && tool.render()}
    </div>
  );
}

function AssistantDemo() {
  const [message, setMessage] = useState('');
  const tool = useAUITool(assistantTool, {
    cache: true,
    onError: (error) => console.error('Assistant error:', error)
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">AI Assistant (With Retry & Cache)</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 px-3 py-2 border rounded"
          placeholder="Ask the assistant..."
        />
        <button
          onClick={() => tool.execute({ message })}
          disabled={tool.loading || !message}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {tool.loading ? 'Thinking...' : 'Send'}
        </button>
      </div>
      {tool.error && (
        <div className="text-red-500">Error: {tool.error.message}</div>
      )}
      {tool.render && tool.render()}
    </div>
  );
}

export default function AUIDemo() {
  return (
    <AUIProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">AUI (Assistant UI) Demo</h1>
            <p className="text-gray-600 mt-2">
              Concise API for AI-controlled frontend and backend in Next.js
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <WeatherDemo />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <SearchDemo />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <DatabaseDemo />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <CalculatorDemo />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <AssistantDemo />
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-900 text-white rounded-lg">
            <h2 className="text-xl font-semibold mb-4">API Examples</h2>
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
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}
            </pre>
          </div>
        </div>
      </div>
    </AUIProvider>
  );
}