import React from 'react';
import aui from '../index';
import { z } from 'zod';
import { aiControlSystem } from '../ai-control';
import { clientControlSystem } from '../client-control';

// Simple weather tool - server execution
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Simulated API call
    const temps = { 'New York': 72, 'London': 65, 'Tokyo': 78 };
    return { 
      temp: temps[input.city as keyof typeof temps] || 70, 
      city: input.city,
      conditions: 'Partly cloudy'
    };
  })
  .render(({ data }) => (
    <div className="weather-widget p-4 bg-blue-50 rounded">
      <h3>{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p>{data.conditions}</p>
    </div>
  ));

// Complex search tool with client caching
const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side database search
    const results = await fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify(input)
    }).then(r => r.json());
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
    
    // Fetch from server
    const data = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    // Cache the result
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  })
  .render(({ data, loading }) => (
    <div className="search-results">
      {loading ? (
        <div>Searching...</div>
      ) : (
        <ul>
          {data?.results?.map((item: any, i: number) => (
            <li key={i}>{item.title}</li>
          ))}
        </ul>
      )}
    </div>
  ));

// AI-controlled form automation
const formAutomationTool = aui
  .tool('form-automation')
  .input(z.object({
    formId: z.string(),
    fields: z.record(z.any()),
    autoSubmit: z.boolean().default(false)
  }))
  .clientExecute(async ({ input }) => {
    const form = document.getElementById(input.formId) as HTMLFormElement;
    if (!form) throw new Error('Form not found');
    
    // Fill form fields
    Object.entries(input.fields).forEach(([name, value]) => {
      const field = form.elements.namedItem(name) as HTMLInputElement;
      if (field) {
        field.value = String(value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    
    // Auto-submit if requested
    if (input.autoSubmit) {
      form.submit();
      return { submitted: true, fields: input.fields };
    }
    
    return { filled: true, fields: input.fields };
  })
  .render(({ data }) => (
    <div className="p-2 bg-green-50 rounded">
      {data.submitted ? 'Form submitted' : 'Form filled'}
      <pre>{JSON.stringify(data.fields, null, 2)}</pre>
    </div>
  ));

// Data visualization tool
const dataVisualizationTool = aui
  .tool('data-viz')
  .input(z.object({
    type: z.enum(['chart', 'table', 'metrics']),
    data: z.array(z.record(z.any())),
    config: z.object({
      title: z.string().optional(),
      xAxis: z.string().optional(),
      yAxis: z.string().optional()
    }).optional()
  }))
  .execute(async ({ input }) => {
    // Process data on server
    return {
      type: input.type,
      processedData: input.data,
      config: input.config
    };
  })
  .render(({ data }) => {
    switch (data.type) {
      case 'metrics':
        return (
          <div className="metrics-grid grid grid-cols-3 gap-4">
            {data.processedData.map((metric: any, i: number) => (
              <div key={i} className="metric-card p-4 bg-gray-50 rounded">
                <h4>{metric.label}</h4>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
            ))}
          </div>
        );
      case 'table':
        return (
          <table className="data-table w-full">
            <thead>
              <tr>
                {Object.keys(data.processedData[0] || {}).map(key => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.processedData.map((row: any, i: number) => (
                <tr key={i}>
                  {Object.values(row).map((val: any, j: number) => (
                    <td key={j}>{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return <div>Chart visualization placeholder</div>;
    }
  });

// Backend control tool for database operations
const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['query', 'insert', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional(),
    where: z.record(z.any()).optional(),
    select: z.array(z.string()).optional()
  }))
  .execute(async ({ input, ctx }) => {
    // This would connect to your actual database
    // For demo, returning mock data
    switch (input.operation) {
      case 'query':
        return {
          rows: [
            { id: 1, name: 'Item 1', created: new Date().toISOString() },
            { id: 2, name: 'Item 2', created: new Date().toISOString() }
          ],
          count: 2
        };
      case 'insert':
        return { id: Math.random(), inserted: true };
      case 'update':
        return { updated: 1 };
      case 'delete':
        return { deleted: 1 };
      default:
        throw new Error('Unknown operation');
    }
  })
  .render(({ data }) => (
    <div className="database-result">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// File operations tool (server-side only)
const fileOperationsTool = aui
  .tool('file-ops')
  .input(z.object({
    action: z.enum(['read', 'write', 'list', 'delete']),
    path: z.string(),
    content: z.string().optional(),
    encoding: z.enum(['utf8', 'base64']).default('utf8')
  }))
  .execute(async ({ input, ctx }) => {
    // Only allow on server
    if (!ctx?.isServer) {
      throw new Error('File operations only available on server');
    }
    
    // Mock file operations
    switch (input.action) {
      case 'read':
        return { content: 'File content here', path: input.path };
      case 'write':
        return { written: true, path: input.path, size: input.content?.length };
      case 'list':
        return { files: ['file1.txt', 'file2.json'], path: input.path };
      case 'delete':
        return { deleted: true, path: input.path };
      default:
        throw new Error('Unknown action');
    }
  });

// AI Control Demo Component
export function AIControlDemo() {
  const [results, setResults] = React.useState<any[]>([]);
  
  const executeAICommand = async (command: string) => {
    // Parse AI command and execute appropriate tool
    const lowerCommand = command.toLowerCase();
    
    try {
      let result;
      
      if (lowerCommand.includes('weather')) {
        const city = command.match(/weather (?:in|for) (.+)/i)?.[1] || 'New York';
        result = await aui.execute('weather', { city });
      } else if (lowerCommand.includes('search')) {
        const query = command.match(/search (?:for )?"(.+)"/i)?.[1] || command;
        result = await aui.execute('search', { query, limit: 5 });
      } else if (lowerCommand.includes('fill form')) {
        result = await aui.execute('form-automation', {
          formId: 'demo-form',
          fields: { name: 'AI User', email: 'ai@example.com' },
          autoSubmit: false
        });
      } else if (lowerCommand.includes('database')) {
        result = await aui.execute('database', {
          operation: 'query',
          table: 'users',
          select: ['id', 'name', 'created']
        });
      } else if (lowerCommand.includes('visualize')) {
        result = await aui.execute('data-viz', {
          type: 'metrics',
          data: [
            { label: 'Users', value: 1234 },
            { label: 'Sessions', value: 5678 },
            { label: 'Revenue', value: '$9,012' }
          ]
        });
      }
      
      setResults(prev => [...prev, { command, result, timestamp: new Date() }]);
    } catch (error) {
      setResults(prev => [...prev, { 
        command, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date() 
      }]);
    }
  };
  
  return (
    <div className="ai-control-demo p-6">
      <h2 className="text-2xl font-bold mb-4">AI Control System Demo</h2>
      
      <div className="command-examples mb-4 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Try these AI commands:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Get weather in Tokyo</li>
          <li>Search for "machine learning"</li>
          <li>Fill form with test data</li>
          <li>Query database users table</li>
          <li>Visualize metrics dashboard</li>
        </ul>
      </div>
      
      <div className="command-input mb-4">
        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder="Enter AI command..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              executeAICommand((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
        />
      </div>
      
      <div className="results space-y-4">
        {results.map((r, i) => (
          <div key={i} className="result-item p-4 border rounded">
            <div className="font-mono text-sm text-gray-600 mb-2">
              {r.timestamp.toLocaleTimeString()} - {r.command}
            </div>
            {r.error ? (
              <div className="text-red-600">Error: {r.error}</div>
            ) : (
              <div className="result-content">
                <pre>{JSON.stringify(r.result, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <form id="demo-form" className="hidden">
        <input name="name" type="text" />
        <input name="email" type="email" />
      </form>
    </div>
  );
}

// Export all tools for registration
export const aiCompleteDemoTools = {
  weatherTool,
  searchTool,
  formAutomationTool,
  dataVisualizationTool,
  databaseTool,
  fileOperationsTool
};

// Register all tools with AI control system
Object.values(aiCompleteDemoTools).forEach(tool => {
  aiControlSystem.register(tool as any);
});

export default AIControlDemo;