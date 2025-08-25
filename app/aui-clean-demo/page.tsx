'use client';

import { useState } from 'react';
import { weatherTool, searchTool, formTool, analyticsTool } from '@/lib/aui/examples/demo-tools';
import { AUIProvider } from '@/lib/aui/provider';

export default function AUICleanDemo() {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [formResult, setFormResult] = useState<any>(null);
  
  const handleWeather = async () => {
    const result = await weatherTool.run({ city: 'San Francisco' });
    setWeatherData(result);
  };
  
  const handleSearch = async () => {
    const result = await searchTool.run({ query: 'Next.js', limit: 5 });
    setSearchResults(result);
  };
  
  const handleForm = async () => {
    const result = await formTool.run({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'This is a test message from the AUI demo'
    });
    setFormResult(result);
  };
  
  const trackEvent = async () => {
    await analyticsTool.run({
      event: 'demo_interaction',
      properties: { page: 'aui-clean-demo' }
    });
  };
  
  return (
    <AUIProvider>
      <div className="container mx-auto p-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">AUI Clean Demo</h1>
        
        <div className="space-y-8">
          {/* Simple Weather Tool Demo */}
          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Simple Tool Example: Weather</h2>
            <p className="text-gray-600 mb-4">
              Minimal API - just .tool(), .input(), .execute(), and .render()
            </p>
            
            <pre className="bg-gray-100 p-4 rounded mb-4 text-sm overflow-x-auto">
{`const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}
            </pre>
            
            <button
              onClick={handleWeather}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
            >
              Get Weather for San Francisco
            </button>
            
            {weatherData && weatherTool.renderer && 
              weatherTool.renderer({ data: weatherData })
            }
          </section>
          
          {/* Complex Search Tool Demo */}
          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Complex Tool Example: Search</h2>
            <p className="text-gray-600 mb-4">
              Adds client-side optimization with caching
            </p>
            
            <pre className="bg-gray-100 p-4 rounded mb-4 text-sm overflow-x-auto">
{`const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}
            </pre>
            
            <button
              onClick={handleSearch}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4"
            >
              Search for "Next.js"
            </button>
            
            {searchResults && searchTool.renderer && 
              searchTool.renderer({ data: searchResults })
            }
          </section>
          
          {/* Form Tool Demo */}
          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Form Submission Tool</h2>
            
            <button
              onClick={handleForm}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 mb-4"
            >
              Submit Test Form
            </button>
            
            {formResult && formTool.renderer && 
              formTool.renderer({ data: formResult })
            }
          </section>
          
          {/* Analytics Tool Demo */}
          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Tool with Middleware</h2>
            
            <button
              onClick={trackEvent}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Track Analytics Event
            </button>
            <p className="text-sm text-gray-500 mt-2">Check console for output</p>
          </section>
        </div>
        
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Key Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li>✅ Clean, fluent API without .build() methods</li>
            <li>✅ TypeScript inference for input/output types</li>
            <li>✅ Optional client-side execution with caching</li>
            <li>✅ React component rendering</li>
            <li>✅ Middleware support for cross-cutting concerns</li>
            <li>✅ Works seamlessly with Next.js server/client components</li>
          </ul>
        </div>
      </div>
    </AUIProvider>
  );
}