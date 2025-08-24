import React from 'react';
import aui, { z } from '../index';

// ========================================
// ULTRA-CONCISE AUI PATTERNS
// ========================================

// 1. SIMPLEST: Just 2 methods (input + execute)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// 2. WITH CLIENT OPTIMIZATION: Adds caching/offline support
const smartTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: Direct DB access
    return { results: [`Server result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: Use cache first, then fetch
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { body: input });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => <div>{data.results.join(', ')}</div>)
  .build();

// 3. ONE-LINER PATTERNS: Maximum conciseness
const tools = {
  // Simple function execution
  upper: aui.do('upper', async (text: string) => text.toUpperCase()),
  
  // With type-safe input
  calc: aui.do('calc', {
    input: z.object({ a: z.number(), b: z.number() }),
    execute: async (input) => input.a + input.b,
  }),
  
  // Full-featured in one call
  chat: aui.do('chat', {
    input: z.object({ message: z.string() }),
    execute: async (input) => ({ reply: `Echo: ${input.message}` }),
    render: (data) => <div>{data.reply}</div>,
    client: async (input, ctx) => ctx.cache.get(input.message) || ctx.fetch('/api/chat', input),
  }),
};

// 4. AI-OPTIMIZED TOOLS: Built for reliability
const aiTools = {
  // Auto-retry, timeout, and caching
  generate: aui.ai('generate', {
    input: z.object({ prompt: z.string() }),
    execute: async (input) => ({ text: `Generated: ${input.prompt}` }),
    retry: 3,      // Auto-retry on failure
    timeout: 5000, // Timeout after 5s
    cache: true,   // Enable caching
  }),
  
  // Batch creation for AI tools
  ...aui.aiTools({
    vision: {
      input: z.object({ image: z.string() }),
      execute: async (input) => ({ description: `Analysis of ${input.image}` }),
      render: (data) => <p>{data.description}</p>,
    },
    code: {
      input: z.object({ task: z.string() }),
      execute: async (input) => ({ code: `// Solution for: ${input.task}` }),
      client: async (input, ctx) => ctx.stream('/api/generate', input),
    },
  }),
};

// 5. FRONTEND/BACKEND CONTROL: AI can control both sides
const controlTools = {
  // Frontend control: Manipulate UI state
  frontend: aui
    .tool('ui-control')
    .input(z.object({ 
      action: z.enum(['theme', 'navigate', 'modal']),
      value: z.string(),
    }))
    .clientExecute(async ({ input, ctx }) => {
      switch (input.action) {
        case 'theme':
          document.documentElement.dataset.theme = input.value;
          return { success: true, action: 'theme-changed' };
        case 'navigate':
          ctx.router.push(input.value);
          return { success: true, action: 'navigated' };
        case 'modal':
          ctx.modal.open(input.value);
          return { success: true, action: 'modal-opened' };
      }
    })
    .render(({ data }) => <div>UI Action: {data.action}</div>)
    .build(),
  
  // Backend control: Database operations
  backend: aui
    .tool('db-control')
    .input(z.object({
      table: z.string(),
      operation: z.enum(['create', 'read', 'update', 'delete']),
      data: z.any(),
    }))
    .serverOnly() // Never expose to client
    .execute(async ({ input }) => {
      // Direct database access
      console.log('DB Operation:', input);
      return { success: true, operation: input.operation };
    })
    .render(({ data }) => <div>DB: {data.operation} completed</div>)
    .build(),
};

// 6. STREAMING & REAL-TIME: For dynamic content
const streamTool = aui
  .tool('stream')
  .input(z.object({ topic: z.string() }))
  .clientExecute(async ({ input, ctx }) => {
    // Stream data from server
    const stream = ctx.stream('/api/stream', { topic: input.topic });
    const chunks: string[] = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
      ctx.update(chunks); // Real-time UI updates
    }
    
    return chunks.join('');
  })
  .render(({ data }) => <pre>{data}</pre>)
  .build();

// 7. QUICK MODE: Auto-build on last method
const quickTools = [
  aui.quick('timestamp')
    .input(z.object({ format: z.string() }))
    .execute(() => new Date().toISOString())
    .render((data) => <time>{data}</time>),
  // No .build() needed!
  
  aui.quick('random')
    .execute(() => Math.random())
    .render((n) => <span>{n.toFixed(4)}</span>),
];

// 8. CONTEXTUAL TOOLS: Access to full context
const contextTool = aui.contextual(
  'user-info',
  z.object({ field: z.string() }),
  async ({ input, ctx }) => {
    const user = await ctx.auth.getUser();
    return user?.[input.field] || 'Not found';
  },
  (data) => <div>User field: {data}</div>
);

// ========================================
// EXPORT ALL PATTERNS
// ========================================

export const auiShowcase = {
  // Basic patterns
  simple: simpleTool,
  smart: smartTool,
  
  // One-liner tools
  ...tools,
  
  // AI-optimized
  ...aiTools,
  
  // Control patterns
  ...controlTools,
  
  // Advanced patterns
  stream: streamTool,
  quick: quickTools,
  context: contextTool,
};

// Type-safe tool usage
export type ToolInputs = {
  weather: z.infer<typeof simpleTool.inputSchema>;
  search: z.infer<typeof smartTool.inputSchema>;
};

// Example: Using tools in a component
export function ToolDemo() {
  const handleWeather = async () => {
    const result = await simpleTool.execute({ 
      input: { city: 'San Francisco' } 
    });
    console.log(result);
  };
  
  return (
    <div>
      <h2>AUI Tool Demo</h2>
      <button onClick={handleWeather}>Check Weather</button>
      {simpleTool.render({ 
        data: { temp: 72, city: 'SF' },
        input: { city: 'SF' }
      })}
    </div>
  );
}