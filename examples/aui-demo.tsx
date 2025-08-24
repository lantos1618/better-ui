import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    const results = await fetch(`/api/search?q=${input.query}`);
    return results.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching
    const cacheKey = `search:${input.query}`;
    if (ctx.cache.has(cacheKey)) {
      return ctx.cache.get(cacheKey);
    }
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify({ query: input.query })
    });
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data }) => (
    <div>
      <h3>Search Results</h3>
      <ul>
        {data.results?.map((item: any) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </div>
  ));

// Ultra-concise helper method
const calculator = aui.simple(
  'calculator',
  z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }),
  ({ a, b, op }) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
      default: throw new Error('Invalid operation');
    }
  },
  (result) => <div>Result: {result}</div>
);

// Batch definition for multiple tools
const tools = aui.defineTools({
  user: {
    input: z.object({ id: z.string() }),
    execute: async (input) => {
      const res = await fetch(`/api/users/${input.id}`);
      return res.json();
    },
    render: (data) => (
      <div className="user-card">
        <h4>{data.name}</h4>
        <p>{data.email}</p>
      </div>
    )
  },
  
  posts: {
    input: z.object({ userId: z.string(), limit: z.number().default(10) }),
    execute: async (input) => {
      const res = await fetch(`/api/posts?userId=${input.userId}&limit=${input.limit}`);
      return res.json();
    },
    client: async (input, ctx) => {
      const key = `posts:${input.userId}:${input.limit}`;
      if (ctx.cache.has(key)) return ctx.cache.get(key);
      
      const data = await ctx.fetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      ctx.cache.set(key, data);
      return data;
    },
    render: (data) => (
      <div className="posts-list">
        {data.posts?.map((post: any) => (
          <article key={post.id}>
            <h5>{post.title}</h5>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </div>
    )
  }
});

// AI-optimized tools with retry and caching
const aiTools = aui.aiTools({
  generate: {
    input: z.object({ prompt: z.string(), maxTokens: z.number().default(100) }),
    execute: async (input) => {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      return res.json();
    },
    retry: 3,
    cache: true,
    timeout: 30000,
    render: (data) => (
      <div className="generated-text">
        <p>{data.text}</p>
        <small>Tokens: {data.tokens}</small>
      </div>
    )
  },
  
  analyze: {
    input: z.object({ 
      text: z.string(), 
      analysisType: z.enum(['sentiment', 'entities', 'summary']) 
    }),
    execute: async (input) => {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      return res.json();
    },
    retry: 2,
    timeout: 20000,
    render: (data) => (
      <div className="analysis-result">
        <h4>Analysis: {data.type}</h4>
        <pre>{JSON.stringify(data.result, null, 2)}</pre>
      </div>
    )
  }
});

// Context-aware tool
const sessionTool = aui.contextual(
  'session',
  z.object({ action: z.enum(['get', 'update', 'delete']) }),
  async ({ input, ctx }) => {
    const user = ctx.user || { id: 'anonymous', name: 'Guest' };
    
    switch (input.action) {
      case 'get':
        return { user, timestamp: Date.now() };
      case 'update':
        // Update session logic
        return { user, updated: true };
      case 'delete':
        // Clear session logic
        return { cleared: true };
      default:
        throw new Error('Invalid action');
    }
  },
  (data) => (
    <div className="session-info">
      {data.user && <p>User: {data.user.name}</p>}
      {data.timestamp && <p>Time: {new Date(data.timestamp).toLocaleString()}</p>}
      {data.updated && <p>Session updated</p>}
      {data.cleared && <p>Session cleared</p>}
    </div>
  )
);

export {
  simpleTool,
  complexTool,
  calculator,
  tools,
  aiTools,
  sessionTool
};