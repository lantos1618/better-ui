import React from 'react';
import aui, { z } from '../index';

// ============================================
// ULTRA-CONCISE AUI EXAMPLES - LANTOS PATTERN
// ============================================

// 1. SIMPLEST TOOL - Just 2 methods (execute + render)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// 2. COMPLEX TOOL - Adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: Direct database access
    const results = await fetch(`/api/search?q=${input.query}`).then(r => r.json());
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: Check cache first
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { body: input });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="search-results">
      {data.map((item: any) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  ))
  .build();

// 3. ONE-LINER TOOLS
const pingTool = aui.do('ping', () => 'pong');
const echoTool = aui.do('echo', (msg: string) => msg);

// 4. SIMPLE HELPER - Auto-registers
const greetingTool = aui.simple(
  'greeting',
  z.object({ name: z.string() }),
  async (input) => `Hello, ${input.name}!`,
  (data) => <div className="greeting">{data}</div>
);

// 5. SERVER-ONLY TOOL
const dbTool = aui.server(
  'db-write',
  z.object({ table: z.string(), data: z.record(z.any()) }),
  async (input) => {
    // This only runs on server
    console.log(`Writing to ${input.table}:`, input.data);
    return { id: Date.now(), ...input.data };
  },
  (data) => <div>Created record #{data.id}</div>
);

// 6. CONTEXTUAL TOOL - Access user context
const userTool = aui.contextual(
  'user-info',
  z.object({ userId: z.string().optional() }),
  async ({ input, ctx }) => {
    const id = input.userId || ctx.userId || 'anonymous';
    return { id, name: `User ${id}`, role: ctx.role || 'guest' };
  },
  (user) => (
    <div className="user-info">
      <span>{user.name}</span>
      <span className="role">{user.role}</span>
    </div>
  )
);

// 7. AI-OPTIMIZED TOOL - Built-in retry & caching
const aiTool = aui.ai('stock-price', {
  input: z.object({ ticker: z.string() }),
  execute: async (input) => {
    const response = await fetch(`/api/stocks/${input.ticker}`);
    if (!response.ok) throw new Error('Stock API failed');
    return response.json();
  },
  client: async (input, ctx) => {
    // Client-side with automatic caching
    return ctx.cachedFetch(`/api/stocks/${input.ticker}`, { ttl: 60000 });
  },
  render: (data) => (
    <div className="stock-price">
      {data.ticker}: ${data.price} ({data.change}%)
    </div>
  ),
  retry: 3,
  timeout: 5000,
  cache: true
});

// 8. BATCH DEFINITION - Multiple tools at once
const uiTools = aui.defineTools({
  'theme-switch': {
    input: z.object({ theme: z.enum(['light', 'dark', 'auto']) }),
    execute: async (input) => {
      document.documentElement.setAttribute('data-theme', input.theme);
      return { theme: input.theme, timestamp: Date.now() };
    },
    render: (data) => <div>Theme changed to {data.theme}</div>
  },
  
  'modal-control': {
    input: z.object({ 
      action: z.enum(['open', 'close']), 
      modalId: z.string() 
    }),
    execute: async (input) => {
      const modal = document.getElementById(input.modalId);
      if (modal) {
        modal.style.display = input.action === 'open' ? 'block' : 'none';
      }
      return { modalId: input.modalId, isOpen: input.action === 'open' };
    },
    render: (data) => (
      <div>Modal {data.modalId} is {data.isOpen ? 'open' : 'closed'}</div>
    )
  },
  
  'layout-toggle': {
    input: z.object({ layout: z.enum(['grid', 'list', 'cards']) }),
    execute: async (input) => {
      document.body.className = `layout-${input.layout}`;
      return { layout: input.layout };
    },
    render: (data) => <div>Layout: {data.layout}</div>
  }
});

// 9. ULTRA-CONCISE WITH SHORTCUTS
const quickWeather = aui.t('quick-weather')
  .i(z.object({ city: z.string() }))
  .e(async (input) => ({ temp: Math.round(50 + Math.random() * 40), city: input.city }))
  .r((data) => <span>{data.city}: {data.temp}°</span>)
  .b();

// 10. CHAINED DEFINITION - All in one
const calculatorTool = aui.tool('calculator')
  .define(
    z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }),
    async (input) => {
      const ops = {
        '+': (a: number, b: number) => a + b,
        '-': (a: number, b: number) => a - b,
        '*': (a: number, b: number) => a * b,
        '/': (a: number, b: number) => a / b,
      };
      return ops[input.op](input.a, input.b);
    },
    (result) => <div className="calc-result">= {result}</div>
  );

// Export all tools for AI control
export const lantosTools = {
  simpleTool,
  complexTool,
  pingTool,
  echoTool,
  greetingTool,
  dbTool,
  userTool,
  aiTool,
  ...uiTools,
  quickWeather,
  calculatorTool
};

// Tool manifest for AI
export const toolManifest = {
  weather: 'Get weather for a city',
  search: 'Search with caching',
  ping: 'Simple ping test',
  echo: 'Echo a message',
  greeting: 'Greet a user',
  'db-write': 'Write to database (server only)',
  'user-info': 'Get user information',
  'stock-price': 'Get stock price with retry',
  'theme-switch': 'Switch UI theme',
  'modal-control': 'Open/close modals',
  'layout-toggle': 'Change page layout',
  'quick-weather': 'Quick weather check',
  calculator: 'Basic calculator'
};

export default lantosTools;