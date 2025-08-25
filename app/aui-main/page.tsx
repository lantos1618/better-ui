'use client';

import { useState } from 'react';
import { simpleTool, complexTool, uiControlTool, databaseTool, analyticsTool, formTool } from '@/lib/aui/examples/main-showcase';
import { aui } from '@/lib/aui';

export default function AUIMainDemo() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const executeSimpleTool = async () => {
    setLoading(prev => ({ ...prev, weather: true }));
    try {
      const ctx = aui.createContext();
      const result = await simpleTool.run({ city: 'Tokyo' }, ctx);
      setResults(prev => ({ ...prev, weather: result }));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(prev => ({ ...prev, weather: false }));
    }
  };

  const executeComplexTool = async () => {
    setLoading(prev => ({ ...prev, search: true }));
    try {
      const ctx = aui.createContext();
      const result = await complexTool.run({ query: 'Next.js tutorials' }, ctx);
      setResults(prev => ({ ...prev, search: result }));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  const executeUIControl = async (action: string) => {
    setLoading(prev => ({ ...prev, ui: true }));
    try {
      const ctx = aui.createContext();
      const result = await uiControlTool.run({ 
        action: action as any, 
        target: '#demo-button',
        value: action === 'type' ? 'Hello AUI!' : undefined
      }, ctx);
      setResults(prev => ({ ...prev, ui: result }));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(prev => ({ ...prev, ui: false }));
    }
  };

  const executeDatabase = async (operation: string) => {
    setLoading(prev => ({ ...prev, db: true }));
    try {
      const ctx = aui.createContext();
      const result = await databaseTool.run({ 
        operation: operation as any,
        table: 'users',
        data: { name: 'AUI User', email: 'user@aui.com' },
        id: '123'
      }, ctx);
      setResults(prev => ({ ...prev, db: result }));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(prev => ({ ...prev, db: false }));
    }
  };

  const executeAnalytics = async () => {
    setLoading(prev => ({ ...prev, analytics: true }));
    try {
      const ctx = aui.createContext();
      const result = await analyticsTool.run({ 
        event: 'demo_clicked',
        properties: { page: 'aui-main', timestamp: Date.now() }
      }, ctx);
      setResults(prev => ({ ...prev, analytics: result }));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  };

  const executeForm = async () => {
    setLoading(prev => ({ ...prev, form: true }));
    try {
      const ctx = aui.createContext();
      const result = await formTool.run({ 
        formId: 'demo-form',
        fields: { name: 'John Doe', email: 'john@example.com' }
      }, ctx);
      setResults(prev => ({ ...prev, form: result }));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(prev => ({ ...prev, form: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-2">AUI (Assistant-UI) System</h1>
      <p className="text-gray-600 mb-8">Concise tool system for AI control of frontend and backend in Next.js</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Simple Tool */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Simple Tool (2 methods)</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm mb-4 overflow-x-auto">
{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => 
    <div>{data.city}: {data.temp}°</div>
  )`}
          </pre>
          <button
            onClick={executeSimpleTool}
            disabled={loading.weather}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading.weather ? 'Loading...' : 'Execute Weather Tool'}
          </button>
          {results.weather && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              Result: {simpleTool.render({ data: results.weather })}
            </div>
          )}
        </div>

        {/* Complex Tool */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Complex Tool (with client optimization)</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm mb-4 overflow-x-auto">
{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => 
    db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || 
      ctx.fetch('/api/tools/search', { 
        body: input 
      });
  })
  .render(({ data }) => 
    <SearchResults results={data} />
  )`}
          </pre>
          <button
            onClick={executeComplexTool}
            disabled={loading.search}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading.search ? 'Searching...' : 'Execute Search Tool'}
          </button>
          {results.search && (
            <div className="mt-4 p-3 bg-green-50 rounded">
              <div className="text-sm font-medium mb-2">Search Results:</div>
              {complexTool.render({ data: results.search })}
            </div>
          )}
        </div>

        {/* UI Control Tool */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">UI Control Tool</h2>
          <p className="text-sm text-gray-600 mb-4">AI can control the frontend</p>
          <div className="space-x-2">
            <button
              id="demo-button"
              onClick={() => executeUIControl('click')}
              disabled={loading.ui}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Simulate Click
            </button>
            <button
              onClick={() => executeUIControl('type')}
              disabled={loading.ui}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Simulate Type
            </button>
          </div>
          {results.ui && (
            <div className="mt-4">
              {uiControlTool.render({ data: results.ui })}
            </div>
          )}
        </div>

        {/* Database Tool */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Database Tool</h2>
          <p className="text-sm text-gray-600 mb-4">Backend operations control</p>
          <div className="space-x-2 mb-4">
            <button
              onClick={() => executeDatabase('create')}
              disabled={loading.db}
              className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => executeDatabase('read')}
              disabled={loading.db}
              className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600 disabled:opacity-50"
            >
              Read
            </button>
            <button
              onClick={() => executeDatabase('update')}
              disabled={loading.db}
              className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600 disabled:opacity-50"
            >
              Update
            </button>
            <button
              onClick={() => executeDatabase('delete')}
              disabled={loading.db}
              className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
          {results.db && databaseTool.render({ data: results.db })}
        </div>

        {/* Analytics Tool */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Analytics Tool</h2>
          <p className="text-sm text-gray-600 mb-4">With middleware for tracking</p>
          <button
            onClick={executeAnalytics}
            disabled={loading.analytics}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {loading.analytics ? 'Tracking...' : 'Track Event'}
          </button>
          {results.analytics && (
            <div className="mt-4">
              {analyticsTool.render({ data: results.analytics })}
            </div>
          )}
        </div>

        {/* Form Tool */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Form Submission Tool</h2>
          <p className="text-sm text-gray-600 mb-4">With optimistic updates</p>
          <button
            onClick={executeForm}
            disabled={loading.form}
            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50"
          >
            {loading.form ? 'Submitting...' : 'Submit Form'}
          </button>
          {results.form && (
            <div className="mt-4">
              {formTool.render({ data: results.form, loading: loading.form })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
        <ul className="space-y-2 text-gray-700">
          <li>✓ Ultra-concise API - tools defined in 2-4 method calls</li>
          <li>✓ No .build() method required - tools are immediately usable</li>
          <li>✓ Type-safe with Zod schema validation</li>
          <li>✓ Server and client execution modes</li>
          <li>✓ Built-in React rendering</li>
          <li>✓ Context for caching and state management</li>
          <li>✓ Middleware support for cross-cutting concerns</li>
          <li>✓ AI-ready tool discovery and execution</li>
        </ul>
      </div>
    </div>
  );
}