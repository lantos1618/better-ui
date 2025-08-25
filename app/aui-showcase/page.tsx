'use client';

import React, { useState } from 'react';
import { AUIProvider } from '@/lib/aui/provider';
import { useAUITool } from '@/lib/aui/hooks/useAUITool';
import { tools as realWorldTools } from '@/lib/aui/examples/real-world';
import { simpleTool, complexTool } from '@/lib/aui/examples/simple-demo';

function SimpleToolDemo() {
  const [city, setCity] = useState('New York');
  const { execute, data, loading, error } = useAUITool(simpleTool);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await execute({ city });
  };
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">🌤️ Simple Tool (Weather)</h3>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Get Weather
        </button>
      </form>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error.message}</div>}
      {data && simpleTool.renderer && simpleTool.renderer({ data })}
    </div>
  );
}

function SearchToolDemo() {
  const [query, setQuery] = useState('');
  const { execute, data, loading, error } = useAUITool(realWorldTools.search);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      await execute({ 
        query: query.trim(), 
        limit: 5,
        filters: { category: 'all' }
      });
    }
  };
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">🔍 Database Search (With Caching)</h3>
      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search database..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Search
        </button>
      </form>
      {realWorldTools.search.renderer && realWorldTools.search.renderer({ 
        data: data || [], 
        loading, 
        error: error || undefined 
      })}
    </div>
  );
}

function FileUploadDemo() {
  const [file, setFile] = useState<File | null>(null);
  const { execute, data, loading, error } = useAUITool(realWorldTools.upload);
  
  const handleUpload = async () => {
    if (file) {
      await execute({ file, processLocally: true });
    }
  };
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">📁 File Upload (Client Processing)</h3>
      <div className="space-y-3">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100"
        />
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 disabled:opacity-50"
        >
          Upload & Process
        </button>
      </div>
      {loading && <div className="mt-3">Processing file...</div>}
      {error && <div className="text-red-500 mt-3">Error: {error.message}</div>}
      {data && realWorldTools.upload.renderer && realWorldTools.upload.renderer({ data })}
    </div>
  );
}

function StockPriceDemo() {
  const [symbol, setSymbol] = useState('AAPL');
  const { execute, data, loading, error } = useAUITool(realWorldTools.realtime);
  
  const handleFetch = async () => {
    await execute({ symbol: symbol.toUpperCase(), interval: 5000 });
  };
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">📈 Real-time Data (Stock Price)</h3>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Stock symbol"
          className="flex-1 px-3 py-2 border rounded uppercase"
          maxLength={5}
        />
        <button
          onClick={handleFetch}
          disabled={loading || !symbol}
          className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50"
        >
          Get Price
        </button>
      </div>
      {loading && <div>Fetching price...</div>}
      {error && <div className="text-red-500">Error: {error.message}</div>}
      {data && realWorldTools.realtime.renderer && realWorldTools.realtime.renderer({ data })}
    </div>
  );
}

function ChartGeneratorDemo() {
  const { execute, data, loading, error } = useAUITool(realWorldTools.chart);
  
  const generateChart = async () => {
    await execute({
      type: 'bar',
      title: 'Sales by Quarter',
      data: [
        { label: 'Q1', value: 45000 },
        { label: 'Q2', value: 52000 },
        { label: 'Q3', value: 48000 },
        { label: 'Q4', value: 61000 }
      ],
      showLegend: true
    });
  };
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">📊 Chart Generator</h3>
      <button
        onClick={generateChart}
        disabled={loading}
        className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
      >
        Generate Sample Chart
      </button>
      {loading && <div className="mt-3">Generating chart...</div>}
      {error && <div className="text-red-500 mt-3">Error: {error.message}</div>}
      {data && realWorldTools.chart.renderer && realWorldTools.chart.renderer({ data })}
    </div>
  );
}

export default function AUIShowcasePage() {
  const [showCode, setShowCode] = useState(false);
  
  return (
    <AUIProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6 max-w-6xl">
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-3">AUI (Assistant-UI) System</h1>
            <p className="text-lg text-gray-600 mb-4">
              Clean, concise tool system for AI-controlled frontend and backend operations in Next.js/Vercel
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCode(!showCode)}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                {showCode ? 'Hide' : 'Show'} Code Examples
              </button>
            </div>
          </header>
          
          {showCode && (
            <section className="mb-8 p-6 bg-gray-900 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">API Examples</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Simple Tool (2 methods)</h3>
                  <pre className="text-gray-100 text-sm overflow-x-auto">
                    <code>{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}</code>
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Complex Tool (with client optimization)</h3>
                  <pre className="text-gray-100 text-sm overflow-x-auto">
                    <code>{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}</code>
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">With Middleware</h3>
                  <pre className="text-gray-100 text-sm overflow-x-auto">
                    <code>{`const protectedTool = aui
  .tool('admin-action')
  .input(z.object({ action: z.string() }))
  .middleware(async ({ input, ctx, next }) => {
    if (!ctx?.user) throw new Error('Auth required');
    console.log(\`User \${ctx.user.id} performing \${input.action}\`);
    return next();
  })
  .execute(async ({ input }) => ({ success: true }))
  .render(({ data }) => <div>✓ Action completed</div>)`}</code>
                  </pre>
                </div>
              </div>
            </section>
          )}
          
          <section>
            <h2 className="text-2xl font-semibold mb-6">Live Demos</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <SimpleToolDemo />
              <SearchToolDemo />
              <FileUploadDemo />
              <StockPriceDemo />
              <ChartGeneratorDemo />
              
              <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50">
                <h3 className="text-lg font-semibold mb-3">✨ More Examples</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Contact Form with validation</li>
                  <li>• AI Assistant with streaming</li>
                  <li>• Database operations</li>
                  <li>• Email sending</li>
                  <li>• Authentication flows</li>
                  <li>• File processing</li>
                  <li>• API Gateway</li>
                  <li>• Background jobs</li>
                  <li>• Cache management</li>
                </ul>
                <p className="text-xs text-gray-600 mt-4">
                  Check <code className="bg-gray-200 px-1 rounded">lib/aui/examples/</code> for full implementations
                </p>
              </div>
            </div>
          </section>
          
          <section className="mt-12 p-6 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Key Features</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="font-medium mb-1">🎯 Simple API</h3>
                <p className="text-gray-600">No .build() methods, just chain and use</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">⚡ Client/Server</h3>
                <p className="text-gray-600">Optimized execution for both environments</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">🔒 Type-Safe</h3>
                <p className="text-gray-600">Full TypeScript support with Zod validation</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">💾 Caching</h3>
                <p className="text-gray-600">Built-in cache support for performance</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">🎨 Rendering</h3>
                <p className="text-gray-600">React components for tool results</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">🔄 Middleware</h3>
                <p className="text-gray-600">Auth, logging, rate limiting support</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AUIProvider>
  );
}