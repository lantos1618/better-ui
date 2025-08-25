'use client';

import React, { useState } from 'react';
import { 
  weatherTool, 
  searchTool, 
  calculatorTool,
  databaseTool,
  fileSystemTool,
  apiTool,
  processTool,
  stateTool,
  notificationTool
} from '@/lib/aui/examples';
import { ToolRenderer } from '@/lib/aui/components/ToolRenderer';
import aui from '@/lib/aui';

export default function AdvancedAUIDemo() {
  const [activeTab, setActiveTab] = useState('basic');
  
  const tabs = [
    { id: 'basic', label: 'Basic Tools' },
    { id: 'data', label: 'Data Tools' },
    { id: 'system', label: 'System Tools' },
    { id: 'code', label: 'Code Examples' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AUI (Assistant-UI) System</h1>
          <p className="text-lg text-gray-600">
            Enable AI assistants to control both frontend and backend through tool calls
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white rounded-lg shadow-sm p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 px-4 py-2 rounded-md transition-colors
                ${activeTab === tab.id 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Basic Tools Tab */}
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weather Tool */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Weather Tool</h3>
              <p className="text-sm text-gray-600 mb-4">Simple tool with execute and render</p>
              <ToolRenderer
                tool={weatherTool}
                input={{ city: 'New York' }}
                context={aui.createContext()}
                autoExecute={true}
              />
            </div>

            {/* Search Tool */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Search Tool</h3>
              <p className="text-sm text-gray-600 mb-4">With client-side caching</p>
              <ToolRenderer
                tool={searchTool}
                input={{ query: 'AI tools' }}
                context={aui.createContext()}
                autoExecute={true}
              />
            </div>

            {/* Calculator Tool */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Calculator Tool</h3>
              <p className="text-sm text-gray-600 mb-4">Instant calculations</p>
              <ToolRenderer
                tool={calculatorTool}
                input={{ a: 42, b: 13, op: '*' as const }}
                context={aui.createContext()}
                autoExecute={true}
              />
            </div>
          </div>
        )}

        {/* Data Tools Tab */}
        {activeTab === 'data' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database Tool */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Database Tool</h3>
              <p className="text-sm text-gray-600 mb-4">Query and modify data</p>
              <ToolRenderer
                tool={databaseTool}
                input={{ 
                  operation: 'query', 
                  table: 'users',
                  select: ['id', 'name', 'status']
                }}
                context={aui.createContext()}
                autoExecute={true}
              />
            </div>

            {/* API Tool */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">API Tool</h3>
              <p className="text-sm text-gray-600 mb-4">Make HTTP requests</p>
              <ToolRenderer
                tool={apiTool}
                input={{ 
                  url: 'https://api.github.com/repos/vercel/next.js',
                  method: 'GET'
                }}
                context={aui.createContext()}
                autoExecute={false}
              />
            </div>

            {/* State Tool */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">State Tool</h3>
              <p className="text-sm text-gray-600 mb-4">Manage application state</p>
              <ToolRenderer
                tool={stateTool}
                input={{ 
                  action: 'set',
                  key: 'demo-state',
                  value: { count: 1, timestamp: new Date().toISOString() }
                }}
                context={aui.createContext()}
                autoExecute={true}
              />
            </div>
          </div>
        )}

        {/* System Tools Tab */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File System Tool */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">File System Tool</h3>
              <p className="text-sm text-gray-600 mb-4">Read and write files</p>
              <ToolRenderer
                tool={fileSystemTool}
                input={{ 
                  operation: 'list',
                  path: '/app'
                }}
                context={aui.createContext()}
                autoExecute={true}
              />
            </div>

            {/* Process Tool */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Process Tool</h3>
              <p className="text-sm text-gray-600 mb-4">Execute commands</p>
              <ToolRenderer
                tool={processTool}
                input={{ 
                  command: 'ls',
                  args: ['-la', '/tmp']
                }}
                context={aui.createContext()}
                autoExecute={true}
              />
            </div>

            {/* Notification Tool */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-2">Notification Tool</h3>
              <p className="text-sm text-gray-600 mb-4">Send notifications</p>
              <ToolRenderer
                tool={notificationTool}
                input={{ 
                  type: 'success',
                  title: 'AUI Demo',
                  message: 'Tool executed successfully!'
                }}
                context={aui.createContext()}
                autoExecute={true}
              />
            </div>
          </div>
        )}

        {/* Code Examples Tab */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold mb-4">Simple Tool Pattern</h3>
              <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto">
{`// Minimal tool - just 2 methods required
const simpleTool = aui
  .tool('weather')
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))

// With input validation
const validatedTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  
// With rendering
const visualTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold mb-4">Advanced Tool Pattern</h3>
              <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto">
{`// Complex tool with client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side execution
    return await db.search(input.query)
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cached = ctx.cache.get(input.query)
    if (cached) return cached
    
    const result = await ctx.fetch('/api/tools/search', { 
      body: input 
    })
    
    ctx.cache.set(input.query, result)
    return result
  })
  .render(({ data }) => <SearchResults results={data} />)`}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold mb-4">AI Agent Integration</h3>
              <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto">
{`// AI can discover and use tools
const tools = aui.getTools()

// AI executes tools
const result = await aui.execute('weather', { city: 'NYC' })

// AI can batch execute
const results = await Promise.all([
  aui.execute('weather', { city: 'NYC' }),
  aui.execute('search', { query: 'news' }),
  aui.execute('database', { operation: 'query', table: 'users' })
])

// Tools are self-documenting for AI
tools.forEach(tool => {
  console.log(tool.name, tool.schema)
})`}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold mb-4">React Integration</h3>
              <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto">
{`// Using the hook
import { useAUITool } from '@/lib/aui/components/ToolRenderer'

function MyComponent() {
  const weather = useAUITool(weatherTool)
  
  return (
    <div>
      <button onClick={() => weather.execute({ city: 'NYC' })}>
        Get Weather
      </button>
      {weather.data && weatherTool.renderer?.({ 
        data: weather.data 
      })}
    </div>
  )
}

// Using the component
import { ToolRenderer } from '@/lib/aui/components/ToolRenderer'

function MyComponent() {
  return (
    <ToolRenderer
      tool={weatherTool}
      input={{ city: 'San Francisco' }}
      autoExecute={true}
    />
  )
}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}