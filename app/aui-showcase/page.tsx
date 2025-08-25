'use client';

import { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';
import { aiControlSystem, aiTools } from '@/lib/aui/ai-control';

const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(60 + Math.random() * 30), 
    city: input.city,
    conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.conditions}</p>
    </div>
  ));

const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      { id: 1, title: `Result for ${input.query}`, score: 0.95 },
      { id: 2, title: `Another match for ${input.query}`, score: 0.87 },
      { id: 3, title: `Related to ${input.query}`, score: 0.72 }
    ];
  })
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input.query })
    }).then(r => r.json()).catch(() => [
      { id: 1, title: `Cached result for ${input.query}`, score: 0.9 }
    ]);
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data, loading }) => (
    <div className="space-y-2">
      {loading && <p className="text-gray-500">Searching...</p>}
      {data?.map((item: any) => (
        <div key={item.id} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
          <h4 className="font-semibold">{item.title}</h4>
          <p className="text-sm text-gray-500">Score: {item.score}</p>
        </div>
      ))}
    </div>
  ));

const formGeneratorTool = aui
  .tool('form-generator')
  .input(z.object({
    title: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'email', 'select', 'checkbox']),
      label: z.string(),
      required: z.boolean().optional(),
      options: z.array(z.string()).optional()
    }))
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => (
    <form className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.title}</h3>
      {data.fields.map(field => (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === 'select' ? (
            <select className="w-full p-2 border rounded-md" name={field.name}>
              <option value="">Select...</option>
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <input
              type="checkbox"
              name={field.name}
              className="h-4 w-4"
            />
          ) : (
            <input
              type={field.type}
              name={field.name}
              required={field.required}
              className="w-full p-2 border rounded-md"
            />
          )}
        </div>
      ))}
      <button 
        type="submit" 
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  ));

interface Results {
  weather?: any;
  search?: any;
  form?: any;
  uiControl?: any;
}

export default function AUIShowcase() {
  const [results, setResults] = useState<Results>({});
  const [auditLog, setAuditLog] = useState<any[]>([]);

  const executeWeather = async () => {
    const result = await weatherTool.run({ city: 'San Francisco' });
    setResults(prev => ({ ...prev, weather: result }));
  };

  const executeSearch = async () => {
    const result = await searchTool.run({ query: 'AI tools' });
    setResults(prev => ({ ...prev, search: result }));
  };

  const executeForm = async () => {
    const result = await formGeneratorTool.run({
      title: 'User Registration',
      fields: [
        { name: 'username', type: 'text', label: 'Username', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'age', type: 'number', label: 'Age' },
        { name: 'country', type: 'select', label: 'Country', options: ['USA', 'UK', 'Canada'] },
        { name: 'newsletter', type: 'checkbox', label: 'Subscribe to newsletter' }
      ]
    });
    setResults(prev => ({ ...prev, form: result }));
  };

  const executeUIControl = async () => {
    try {
      const result = await aiTools.uiManipulation.run({
        selector: '#demo-button',
        action: 'click'
      });
      setResults(prev => ({ ...prev, uiControl: result }));
    } catch (error) {
      console.error('UI Control error:', error);
    }
  };

  const showAuditLog = () => {
    const logs = aiControlSystem.getAuditLog();
    setAuditLog(logs);
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">AUI System Showcase</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Simple Tools</h2>
          
          <div className="p-4 border rounded-lg">
            <h3 className="font-bold mb-2">Weather Tool</h3>
            <button 
              onClick={executeWeather}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Get Weather
            </button>
            {results.weather && weatherTool.renderer && 
              weatherTool.renderer({ data: results.weather })}
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-bold mb-2">Search Tool (with caching)</h3>
            <button 
              onClick={executeSearch}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Search
            </button>
            {results.search && searchTool.renderer && 
              searchTool.renderer({ data: results.search })}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">AI Control Tools</h2>
          
          <div className="p-4 border rounded-lg">
            <h3 className="font-bold mb-2">Form Generator</h3>
            <button 
              onClick={executeForm}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
              Generate Form
            </button>
            {results.form && formGeneratorTool.renderer && 
              formGeneratorTool.renderer({ data: results.form })}
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-bold mb-2">UI Control</h3>
            <button 
              id="demo-button"
              onClick={() => alert('Button clicked by AI!')}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mb-2"
            >
              Target Button
            </button>
            <br />
            <button 
              onClick={executeUIControl}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              AI Click Target
            </button>
            {results.uiControl && (
              <div className="mt-2 p-2 bg-green-50 text-green-700 rounded">
                ✓ AI executed: {results.uiControl.action} on {results.uiControl.selector}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Audit & Monitoring</h2>
        
        <div className="p-4 border rounded-lg">
          <button 
            onClick={showAuditLog}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mb-4"
          >
            Show Audit Log
          </button>
          
          {auditLog.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold">Execution History</h3>
              {auditLog.map((log, idx) => (
                <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{log.tool}</span>
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs mt-1 text-gray-600">
                    {JSON.stringify(log.input, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold mb-2">About AUI</h3>
        <p className="text-sm text-gray-700">
          AUI (Assistant-UI) is a concise system for creating tools that AI assistants can use to control 
          both frontend and backend operations in Next.js applications. Tools are created with a simple, 
          chainable API and can include input validation, server/client execution, and React rendering.
        </p>
        <div className="mt-2 text-xs text-gray-600">
          <p>✓ Type-safe with Zod schemas</p>
          <p>✓ Client and server execution modes</p>
          <p>✓ Built-in caching and optimization</p>
          <p>✓ Audit logging and rate limiting</p>
          <p>✓ React component rendering</p>
        </div>
      </div>
    </div>
  );
}