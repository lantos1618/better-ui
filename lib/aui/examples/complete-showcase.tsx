import React from 'react';
import aui, { z } from '../index';

// Complete AUI Showcase - All patterns for AI control

// 1. Simplest form - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// 2. Complex tool with client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    console.log('Searching database for:', input.query);
    return { results: [`Result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="search-results">
      {data.results.map((item: string, i: number) => (
        <div key={i}>{item}</div>
      ))}
    </div>
  ))
  .build();

// 3. Ultra-concise with single character methods
const ultraConcise = aui.t('calc')
  .i(z.object({ a: z.number(), b: z.number() }))
  .e(async (i) => i.a + i.b)
  .r((d) => <div>Result: {d}</div>)
  .b();

// 4. One-liner with do() method
const oneLiner = aui.do('uppercase', async (text: string) => text.toUpperCase());

// 5. AI-optimized with retry and caching
const aiOptimized = aui.ai('reliable-api', {
  input: z.object({ endpoint: z.string(), data: z.any() }),
  execute: async (input) => {
    const response = await fetch(input.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.data)
    });
    return response.json();
  },
  retry: 5,
  timeout: 10000,
  cache: true,
  render: (data) => <pre>{JSON.stringify(data, null, 2)}</pre>
});

// 6. Frontend control tools for AI
const frontendControl = aui.aiTools({
  click: {
    input: z.object({ selector: z.string() }),
    client: async (input) => {
      const element = document.querySelector(input.selector) as HTMLElement;
      element?.click();
      return { clicked: true, selector: input.selector };
    },
    execute: async (input) => ({ clicked: false, selector: input.selector })
  },
  
  type: {
    input: z.object({ selector: z.string(), text: z.string() }),
    client: async (input) => {
      const element = document.querySelector(input.selector) as HTMLInputElement;
      if (element) {
        element.value = input.text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return { typed: true };
    },
    execute: async (input) => ({ typed: false })
  },
  
  screenshot: {
    input: z.object({ selector: z.string().optional() }),
    client: async (input) => {
      // Would use html2canvas in real implementation
      return { captured: true, selector: input.selector || 'body' };
    },
    execute: async (input) => ({ captured: false })
  }
});

// 7. Backend control for database operations
const backendControl = aui.server(
  'database',
  z.object({
    operation: z.enum(['query', 'insert', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional()
  }),
  async (input) => {
    // Server-only database operations
    console.log(`DB Operation: ${input.operation} on ${input.table}`);
    return { success: true, operation: input.operation };
  },
  (result) => (
    <div className={`db-result ${result.success ? 'success' : 'error'}`}>
      {result.operation} completed
    </div>
  )
);

// 8. State management tool
const stateManager = aui.create('state', {
  input: z.object({
    key: z.string(),
    value: z.any().optional(),
    operation: z.enum(['get', 'set', 'delete'])
  }),
  client: async (input, ctx) => {
    switch (input.operation) {
      case 'set':
        localStorage.setItem(input.key, JSON.stringify(input.value));
        return { success: true, value: input.value };
      case 'get':
        const value = localStorage.getItem(input.key);
        return { success: true, value: value ? JSON.parse(value) : null };
      case 'delete':
        localStorage.removeItem(input.key);
        return { success: true };
    }
  },
  execute: async (input) => ({ success: true, operation: input.operation }),
  render: (data) => (
    <div className="state-result">
      State operation: {data.success ? 'Success' : 'Failed'}
    </div>
  )
});

// 9. Quick mode - auto-builds after render
const quickMode = aui
  .quick('auto-build')
  .in(z.object({ message: z.string() }))
  .ex(async (input) => ({ processed: input.message.toUpperCase() }))
  .out((data) => <div>{data.processed}</div>);
// No .build() needed!

// 10. Batch tool definition
const batchTools = aui.defineTools({
  timer: {
    input: z.object({ seconds: z.number() }),
    execute: async (input) => {
      await new Promise(resolve => setTimeout(resolve, input.seconds * 1000));
      return { completed: true, duration: input.seconds };
    },
    render: (data) => <div>Timer completed: {data.duration}s</div>
  },
  
  random: {
    input: z.object({ min: z.number(), max: z.number() }),
    execute: async (input) => {
      const value = Math.floor(Math.random() * (input.max - input.min + 1)) + input.min;
      return { value };
    },
    render: (data) => <div>Random: {data.value}</div>
  },
  
  fetch: {
    input: z.object({ url: z.string() }),
    execute: async (input) => {
      const response = await fetch(input.url);
      return { status: response.status, ok: response.ok };
    },
    render: (data) => (
      <div className={data.ok ? 'success' : 'error'}>
        Status: {data.status}
      </div>
    )
  }
});

// Export all tools
export const showcaseTools = {
  simpleTool,
  complexTool,
  ultraConcise,
  oneLiner,
  aiOptimized,
  frontendControl,
  backendControl,
  stateManager,
  quickMode,
  batchTools
};

// Example usage component
export function AUIShowcase() {
  return (
    <div className="aui-showcase">
      <h1>AUI - Assistant UI Tools</h1>
      <p>Ultra-concise API for AI to control frontend and backend</p>
      
      <div className="tool-examples">
        <h2>Tool Patterns:</h2>
        <ul>
          <li>Simple: 2 methods (execute + render)</li>
          <li>Complex: Server + client execution with caching</li>
          <li>Ultra-concise: Single character methods (i, e, r, b)</li>
          <li>One-liner: do() method for instant tools</li>
          <li>AI-optimized: Retry, timeout, and caching built-in</li>
          <li>Frontend control: Click, type, screenshot</li>
          <li>Backend control: Secure server-only operations</li>
          <li>State management: LocalStorage with client/server sync</li>
          <li>Quick mode: Auto-build after render</li>
          <li>Batch definition: Multiple tools at once</li>
        </ul>
      </div>
      
      <div className="usage">
        <h2>Usage:</h2>
        <pre>{`
// Simplest form
const tool = aui
  .tool('name')
  .input(z.object({ ... }))
  .execute(async (input) => result)
  .render((data) => <div>{data}</div>)
  .build();

// Ultra-concise
const tool = aui.t('name')
  .i(schema)
  .e(handler)
  .r(renderer)
  .b();

// One-liner
const tool = aui.do('name', handler);

// AI-optimized
const tool = aui.ai('name', {
  execute: handler,
  retry: 5,
  cache: true
});
        `}</pre>
      </div>
    </div>
  );
}

export default showcaseTools;