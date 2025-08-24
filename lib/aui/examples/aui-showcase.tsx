import React from 'react';
import aui, { z } from '../index';

// ============================================================================
// AUI - CONCISE API FOR AI CONTROL
// ============================================================================

// 1. SIMPLE TOOL - Just 2-4 methods for basic tools
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Simulate API call
    const weather = {
      city: input.city,
      temp: Math.floor(60 + Math.random() * 30),
      condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
    };
    return weather;
  })
  .render(({ data }) => (
    <div className="weather-card">
      <h3>{data.city}</h3>
      <p>{data.temp}°F - {data.condition}</p>
    </div>
  ))
  .build();

// 2. COMPLEX TOOL - With client-side optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side database search
    const results = await performDatabaseSearch(input.query, input.limit);
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching and optimization
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
    
    const results = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    ctx.cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  })
  .render(({ data }) => (
    <div className="search-results">
      <h3>Search Results</h3>
      {data.map((item: any) => (
        <div key={item.id} className="result-item">
          <h4>{item.title}</h4>
          <p>{item.description}</p>
          <span className="score">Score: {item.score.toFixed(2)}</span>
        </div>
      ))}
    </div>
  ))
  .build();

// 3. ULTRA-CONCISE API - Using shorthand methods
export const calculatorTool = aui
  .t('calculator')
  .i(z.object({ 
    a: z.number(), 
    b: z.number(), 
    op: z.enum(['+', '-', '*', '/']) 
  }))
  .e(({ a, b, op }) => {
    const operations = {
      '+': a + b,
      '-': a - b,
      '*': a * b,
      '/': b !== 0 ? a / b : NaN
    };
    return operations[op];
  })
  .r((result) => <div>Result: {result}</div>)
  .b();

// 4. AI-OPTIMIZED TOOL - With retry and caching
export const aiAnalysisTool = aui.ai('analyze', {
  input: z.object({ 
    text: z.string(),
    type: z.enum(['sentiment', 'summary', 'keywords'])
  }),
  execute: async (input) => {
    // Simulate AI analysis
    const analysis = await performAIAnalysis(input.text, input.type);
    return analysis;
  },
  client: async (input, ctx) => {
    const cacheKey = `ai:${input.type}:${input.text.slice(0, 50)}`;
    return ctx.cache.get(cacheKey) || ctx.fetch('/api/ai/analyze', { 
      method: 'POST',
      body: JSON.stringify(input)
    });
  },
  render: (data) => (
    <div className="ai-analysis">
      <h3>AI Analysis</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ),
  retry: 3,
  timeout: 10000,
  cache: true
});

// 5. BATCH TOOL DEFINITION
export const batchTools = aui.defineTools({
  userProfile: {
    input: z.object({ userId: z.string() }),
    execute: async ({ userId }) => {
      return { id: userId, name: 'John Doe', role: 'Developer' };
    },
    render: (data) => (
      <div className="profile">
        <h4>{data.name}</h4>
        <p>Role: {data.role}</p>
      </div>
    )
  },
  
  todoList: {
    input: z.object({ status: z.enum(['pending', 'completed', 'all']) }),
    execute: async ({ status }) => {
      const todos = [
        { id: 1, text: 'Build AUI', status: 'completed' },
        { id: 2, text: 'Test tools', status: 'pending' },
        { id: 3, text: 'Deploy', status: 'pending' }
      ];
      return status === 'all' ? todos : todos.filter(t => t.status === status);
    },
    render: (todos) => (
      <ul className="todo-list">
        {todos.map((todo: any) => (
          <li key={todo.id} className={todo.status}>
            {todo.text}
          </li>
        ))}
      </ul>
    )
  }
});

// 6. ONE-LINER TOOLS
export const timestampTool = aui.do('timestamp', () => new Date().toISOString());

export const randomNumberTool = aui.do('random', {
  input: z.object({ min: z.number(), max: z.number() }),
  execute: ({ min, max }) => Math.floor(Math.random() * (max - min + 1)) + min,
  render: (num) => <span>Random: {num}</span>
});

// Helper functions
async function performDatabaseSearch(query: string, limit: number) {
  // Simulate database search
  await new Promise(resolve => setTimeout(resolve, 100));
  return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
    id: i + 1,
    title: `Result ${i + 1} for "${query}"`,
    description: `This is a search result matching your query: ${query}`,
    score: Math.random()
  })).sort((a, b) => b.score - a.score);
}

async function performAIAnalysis(text: string, type: string) {
  // Simulate AI analysis
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const analyses: Record<string, any> = {
    sentiment: {
      score: Math.random() * 2 - 1,
      label: Math.random() > 0.5 ? 'positive' : 'negative',
      confidence: Math.random()
    },
    summary: {
      text: text.slice(0, 100) + '...',
      keywords: text.split(' ').slice(0, 5)
    },
    keywords: {
      words: text.split(' ').filter(w => w.length > 4).slice(0, 10),
      relevance: Array.from({ length: 10 }, () => Math.random())
    }
  };
  
  return analyses[type] || { error: 'Unknown analysis type' };
}

// Export all tools for easy access
export const allTools = {
  weather: weatherTool,
  search: searchTool,
  calculator: calculatorTool,
  analyze: aiAnalysisTool,
  ...batchTools,
  timestamp: timestampTool,
  random: randomNumberTool
};

// Register all tools
Object.values(allTools).forEach(tool => aui.register(tool));