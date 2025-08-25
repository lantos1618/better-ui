'use client';

import React, { useState } from 'react';
import { simpleTool, complexTool, formTool, databaseTool } from '@/lib/aui/examples/core-tools';
import aui from '@/lib/aui';

export default function AUICoreDemo() {
  const [weatherCity, setWeatherCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('Next.js');
  const [weatherResult, setWeatherResult] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [formResult, setFormResult] = useState<any>(null);
  const [dbResult, setDbResult] = useState<any>(null);

  const handleWeather = async () => {
    const result = await simpleTool.run({ city: weatherCity });
    setWeatherResult(result);
  };

  const handleSearch = async () => {
    const results = await complexTool.run({ query: searchQuery });
    setSearchResults(results);
  };

  const handleFormSubmit = async () => {
    const result = await formTool.run(formData);
    setFormResult(result);
  };

  const handleDatabase = async (operation: string) => {
    const result = await databaseTool.run({
      operation: operation as any,
      table: 'users',
      data: operation === 'create' ? { name: 'John Doe', email: 'john@example.com' } : undefined,
      where: operation === 'read' ? { active: true } : undefined
    });
    setDbResult(result);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">AUI Core Demo</h1>
      
      {/* Simple Weather Tool */}
      <section className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Simple Tool - Weather</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={weatherCity}
            onChange={(e) => setWeatherCity(e.target.value)}
            className="px-4 py-2 border rounded"
            placeholder="Enter city"
          />
          <button
            onClick={handleWeather}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Get Weather
          </button>
        </div>
        {weatherResult && simpleTool.renderer && (
          <div className="p-4 bg-white rounded">
            {simpleTool.renderer({ data: weatherResult })}
          </div>
        )}
      </section>

      {/* Complex Search Tool */}
      <section className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Complex Tool - Search</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border rounded"
            placeholder="Search query"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Search
          </button>
        </div>
        {searchResults && complexTool.renderer && (
          <div className="p-4 bg-white rounded">
            {complexTool.renderer({ data: searchResults })}
          </div>
        )}
      </section>

      {/* Form Tool */}
      <section className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Contact Form Tool</h2>
        <div className="space-y-4 mb-4">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border rounded"
            placeholder="Name"
          />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border rounded"
            placeholder="Email"
          />
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-2 border rounded"
            placeholder="Message"
            rows={4}
          />
          <button
            onClick={handleFormSubmit}
            className="px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Submit Form
          </button>
        </div>
        {formResult && formTool.renderer && (
          <div className="p-4 bg-white rounded">
            {formTool.renderer({ data: formResult })}
          </div>
        )}
      </section>

      {/* Database Tool */}
      <section className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Database Tool</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => handleDatabase('create')}
            className="px-6 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Create
          </button>
          <button
            onClick={() => handleDatabase('read')}
            className="px-6 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Read
          </button>
          <button
            onClick={() => handleDatabase('update')}
            className="px-6 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Update
          </button>
          <button
            onClick={() => handleDatabase('delete')}
            className="px-6 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Delete
          </button>
        </div>
        {dbResult && databaseTool.renderer && (
          <div className="p-4 bg-white rounded">
            {databaseTool.renderer({ data: dbResult, input: { operation: 'create', table: 'users' } })}
          </div>
        )}
      </section>

      {/* Code Example */}
      <section className="mb-8 p-6 bg-gray-900 text-white rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Code Example</h2>
        <pre className="overflow-x-auto">
          <code>{`// Simple tool - just 2 methods
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
  .render(({ data }) => <SearchResults results={data} />)`}</code>
        </pre>
      </section>
    </div>
  );
}