// AUI (Assistant-UI) - Concise tool system for AI control in Next.js/Vercel
// This file shows the exact API you requested

import aui from '@/lib/aui';
import { z } from 'zod';

// ============================================
// YOUR EXACT REQUESTED API - WORKING NOW! ✅
// ============================================

// Simple tool - just 2 methods
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
  .render(({ data }) => <SearchResults results={data} />)

// ============================================
// MORE EXAMPLES FOR AI CONTROL
// ============================================

// Frontend control - AI can manipulate UI
const uiControl = aui
  .tool('ui-control')
  .input(z.object({ 
    action: z.enum(['show', 'hide', 'toggle']),
    selector: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    if (element) {
      const el = element as HTMLElement;
      switch (input.action) {
        case 'show': el.style.display = 'block'; break;
        case 'hide': el.style.display = 'none'; break;
        case 'toggle': el.style.display = el.style.display === 'none' ? 'block' : 'none'; break;
      }
    }
    return { success: true, action: input.action };
  })
  .render(({ data }) => <div>✓ {data.action} completed</div>)

// Backend control - AI can manage database
const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side database operations
    switch (input.operation) {
      case 'create': return await db.insert(input.table, input.data);
      case 'read': return await db.find(input.table, input.data);
      case 'update': return await db.update(input.table, input.data);
      case 'delete': return await db.delete(input.table, input.data);
    }
  })
  .render(({ data }) => <pre>{JSON.stringify(data, null, 2)}</pre>)

// ============================================
// HOW TO USE IN YOUR APP
// ============================================

// 1. In React components with hooks:
import { useAUITool } from '@/lib/aui/hooks/useAUITool';

function MyComponent() {
  const { execute, data, loading } = useAUITool(simpleTool);
  
  return (
    <button onClick={() => execute({ city: 'Tokyo' })}>
      Get Weather
    </button>
  );
}

// 2. Programmatically (for AI agents):
async function aiUsage() {
  // List all available tools
  const tools = aui.getTools();
  
  // Execute a tool directly
  const result = await simpleTool.run({ city: 'Paris' });
  console.log(result); // { temp: 72, city: 'Paris' }
  
  // Execute with context (for caching, auth, etc.)
  const context = {
    cache: new Map(),
    fetch: globalThis.fetch,
    user: { id: 1, role: 'admin' }
  };
  const data = await complexTool.run({ query: 'AI' }, context);
}

// 3. Wrap your app with the provider:
import { AUIProvider } from '@/lib/aui/provider';

export default function App() {
  return (
    <AUIProvider>
      {/* Your app components */}
    </AUIProvider>
  );
}

// ============================================
// KEY FEATURES
// ============================================
// ✅ No .build() method needed - tools work immediately
// ✅ Clean, chainable API
// ✅ Server execution by default with .execute()
// ✅ Optional client optimization with .clientExecute()
// ✅ React rendering with .render()
// ✅ Full TypeScript and Zod validation
// ✅ Context with caching, auth, and more
// ✅ AI can control both frontend and backend