import { z } from 'zod';
import aui from './index';
import { createAITool } from './ai-control';
import React from 'react';

export const weatherTool = aui
  .tool('weather')
  .input(z.object({ 
    city: z.string(),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius').optional()
  }))
  .execute(async ({ input }) => {
    const mockTemp = Math.floor(Math.random() * 30) + 10;
    const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return { 
      temp: input.units === 'fahrenheit' ? Math.floor(mockTemp * 9/5 + 32) : mockTemp,
      city: input.city,
      condition,
      units: input.units || 'celsius'
    };
  })
  .render(({ data }) => (
    <div className="weather-widget p-4 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-bold">{data.city}</h3>
      <p className="text-2xl">{data.temp}°{data.units === 'celsius' ? 'C' : 'F'}</p>
      <p className="text-gray-600">{data.condition}</p>
    </div>
  ));

export const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().default(10).optional(),
    filters: z.object({
      category: z.string().optional(),
      dateRange: z.object({
        from: z.string().optional(),
        to: z.string().optional()
      }).optional()
    }).optional()
  }))
  .execute(async ({ input, ctx }) => {
    const results = Array.from({ length: input.limit || 10 }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${input.query}"`,
      description: `This is a search result for ${input.query}`,
      url: `https://example.com/result-${i + 1}`,
      relevance: Math.random()
    })).sort((a, b) => b.relevance - a.relevance);
    
    return { 
      query: input.query,
      results,
      totalCount: 100,
      filters: input.filters
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    ctx.cache.set(input.query, data);
    return data;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Searching...</div>;
    if (error) return <div>Error: {error.message}</div>;
    
    return (
      <div className="search-results">
        <h3>Results for &quot;{data.query}&quot; ({data.totalCount} total)</h3>
        <ul>
          {data.results.map((result: any) => (
            <li key={result.id} className="mb-2">
              <a href={result.url} className="text-blue-600 hover:underline">
                {result.title}
              </a>
              <p className="text-sm text-gray-600">{result.description}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  });

export const dataVisualizationTool = createAITool('data-viz', {
  permissions: {
    allowClientExecution: true,
    allowServerExecution: true
  },
  audit: true
})
  .input(z.object({
    type: z.enum(['chart', 'table', 'metric']),
    data: z.array(z.record(z.any())),
    config: z.object({
      title: z.string().optional(),
      xAxis: z.string().optional(),
      yAxis: z.string().optional(),
      color: z.string().optional()
    }).optional()
  }))
  .describe('Visualize data in various formats')
  .tag('visualization', 'data', 'chart')
  .execute(async ({ input }) => {
    return {
      type: input.type,
      processedData: input.data,
      config: {
        title: input.config?.title || 'Data Visualization',
        ...input.config
      }
    };
  })
  .render(({ data }) => {
    switch (data.type) {
      case 'metric':
        const value = data.processedData[0]?.value || 0;
        return (
          <div className="metric-display p-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg">
            <h3 className="text-sm opacity-90">{data.config.title}</h3>
            <p className="text-4xl font-bold">{value}</p>
          </div>
        );
      
      case 'table':
        return (
          <div className="table-container">
            <h3 className="text-lg font-bold mb-2">{data.config.title}</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {Object.keys(data.processedData[0] || {}).map(key => (
                    <th key={key} className="border p-2 bg-gray-100">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.processedData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="border p-2">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return (
          <div className="chart-placeholder p-8 bg-gray-100 rounded-lg text-center">
            <p>Chart: {data.config.title}</p>
            <p className="text-sm text-gray-600">
              {data.processedData.length} data points
            </p>
          </div>
        );
    }
  });

export const userInteractionTool = createAITool('user-interaction', {
  permissions: {
    allowClientExecution: true
  },
  audit: true
})
  .input(z.object({
    type: z.enum(['alert', 'confirm', 'prompt', 'notification']),
    message: z.string(),
    title: z.string().optional(),
    options: z.object({
      confirmText: z.string().optional(),
      cancelText: z.string().optional(),
      defaultValue: z.string().optional(),
      timeout: z.number().optional()
    }).optional()
  }))
  .describe('Interact with users through various UI patterns')
  .tag('ui', 'interaction', 'user')
  .clientExecute(async ({ input }) => {
    switch (input.type) {
      case 'alert':
        alert(input.message);
        return { type: 'alert', acknowledged: true };
      
      case 'confirm':
        const confirmed = confirm(input.message);
        return { type: 'confirm', confirmed };
      
      case 'prompt':
        const response = prompt(input.message, input.options?.defaultValue);
        return { type: 'prompt', response };
      
      case 'notification':
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(input.title || 'Notification', {
            body: input.message,
            icon: '/icon.png'
          });
        }
        return { type: 'notification', sent: true };
      
      default:
        throw new Error('Unknown interaction type');
    }
  });

export const workflowTool = aui
  .tool('workflow')
  .input(z.object({
    steps: z.array(z.object({
      id: z.string(),
      tool: z.string(),
      input: z.any(),
      dependsOn: z.array(z.string()).optional()
    }))
  }))
  .describe('Execute multi-step workflows with tool orchestration')
  .tag('workflow', 'orchestration', 'automation')
  .execute(async ({ input, ctx }) => {
    const results = new Map<string, any>();
    const completed = new Set<string>();
    
    const executeStep = async (step: any) => {
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          if (!completed.has(dep)) {
            const depStep = input.steps.find((s: any) => s.id === dep);
            if (depStep) await executeStep(depStep);
          }
        }
      }
      
      if (!completed.has(step.id)) {
        const tool = aui.get(step.tool);
        if (tool) {
          const result = await tool.run(step.input, ctx);
          results.set(step.id, result);
          completed.add(step.id);
        }
      }
    };
    
    for (const step of input.steps) {
      await executeStep(step);
    }
    
    return {
      workflow: 'completed',
      steps: Array.from(results.entries()).map(([id, result]) => ({
        id,
        result
      }))
    };
  });

export const analyticsTrackingTool = createAITool('analytics', {
  permissions: {
    allowClientExecution: true
  },
  audit: true,
  rateLimit: {
    requestsPerMinute: 100
  }
})
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional(),
    userId: z.string().optional(),
    timestamp: z.string().optional()
  }))
  .describe('Track analytics events and user behavior')
  .tag('analytics', 'tracking', 'metrics')
  .clientExecute(async ({ input }) => {
    console.log('Analytics Event:', input);
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', input.event, input.properties);
    }
    
    return {
      tracked: true,
      event: input.event,
      timestamp: input.timestamp || new Date().toISOString()
    };
  });

export const stateManagementTool = aui
  .tool('state-manager')
  .input(z.object({
    action: z.enum(['get', 'set', 'update', 'subscribe']),
    key: z.string(),
    value: z.any().optional(),
    updater: z.function().optional()
  }))
  .describe('Manage application state across components')
  .tag('state', 'management', 'store')
  .execute(async ({ input }) => {
    const globalState = (global as any).__appState || ((global as any).__appState = new Map());
    
    switch (input.action) {
      case 'get':
        return { value: globalState.get(input.key) };
      
      case 'set':
        globalState.set(input.key, input.value);
        return { success: true, key: input.key };
      
      case 'update':
        const current = globalState.get(input.key);
        const updated = input.updater ? input.updater(current) : { ...current, ...input.value };
        globalState.set(input.key, updated);
        return { success: true, key: input.key, value: updated };
      
      case 'subscribe':
        return { 
          success: true, 
          message: 'Subscription would be handled by React context or state management library' 
        };
      
      default:
        throw new Error('Unknown state action');
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    const stateCache = ctx.cache;
    
    switch (input.action) {
      case 'get':
        return { value: stateCache.get(input.key) };
      
      case 'set':
        stateCache.set(input.key, input.value);
        return { success: true, key: input.key };
      
      case 'update':
        const current = stateCache.get(input.key);
        const updated = { ...current, ...input.value };
        stateCache.set(input.key, updated);
        return { success: true, key: input.key, value: updated };
      
      default:
        return { success: false, message: 'Unknown action' };
    }
  });

export const allExampleTools = [
  weatherTool,
  searchTool,
  dataVisualizationTool,
  userInteractionTool,
  workflowTool,
  analyticsTrackingTool,
  stateManagementTool
];