import React from 'react';
import aui, { z, t, defineTool } from '../index';

// Method 1: Ultra-concise with t() helper
const weatherTool = t('weather')
  .in(z.object({ city: z.string() }))
  .ex(async (input) => ({ temp: 72, city: input.city }))
  .out((data) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Method 2: One-liner with define()
const calculatorTool = t('calculator')
  .define(
    z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }),
    async (input) => {
      switch (input.op) {
        case '+': return input.a + input.b;
        case '-': return input.a - input.b;
        case '*': return input.a * input.b;
        case '/': return input.a / input.b;
      }
    },
    (result) => <div>Result: {result}</div>
  );

// Method 3: Using defineTool helper function
const searchTool = defineTool('search', {
  input: z.object({ query: z.string(), limit: z.number().optional() }),
  execute: async (input) => {
    // Mock search
    const results = Array.from({ length: input.limit || 10 }, (_, i) => ({
      id: i,
      title: `Result ${i + 1} for "${input.query}"`,
      score: Math.random()
    }));
    return results.sort((a, b) => b.score - a.score);
  },
  client: async (input, ctx) => {
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    ctx.cache.set(input.query, result);
    return result;
  },
  render: (results) => (
    <div className="search-results">
      {results.map((item: any) => (
        <div key={item.id} className="result-item">
          <h3>{item.title}</h3>
          <span className="score">Score: {item.score.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
});

// Method 4: Batch definition for multiple tools
const aiTools = aui.defineTools({
  chat: {
    input: z.object({ message: z.string(), context: z.array(z.string()).optional() }),
    execute: async (input) => ({
      response: `You said: ${input.message}`,
      timestamp: new Date().toISOString()
    }),
    render: (data) => (
      <div className="chat-response">
        <p>{data.response}</p>
        <time>{data.timestamp}</time>
      </div>
    )
  },
  
  imageGen: {
    input: z.object({ prompt: z.string(), style: z.enum(['realistic', 'cartoon', 'abstract']) }),
    execute: async (input) => ({
      url: `https://placeholder.com/512x512?text=${encodeURIComponent(input.prompt)}`,
      prompt: input.prompt,
      style: input.style
    }),
    render: (data) => (
      <div className="generated-image">
        <img src={data.url} alt={data.prompt} />
        <p>Style: {data.style}</p>
      </div>
    )
  },
  
  dataAnalysis: {
    input: z.object({ 
      dataset: z.array(z.number()),
      operation: z.enum(['sum', 'avg', 'min', 'max', 'std'])
    }),
    execute: async (input) => {
      const { dataset, operation } = input;
      switch (operation) {
        case 'sum': return dataset.reduce((a, b) => a + b, 0);
        case 'avg': return dataset.reduce((a, b) => a + b, 0) / dataset.length;
        case 'min': return Math.min(...dataset);
        case 'max': return Math.max(...dataset);
        case 'std': {
          const avg = dataset.reduce((a, b) => a + b, 0) / dataset.length;
          const variance = dataset.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / dataset.length;
          return Math.sqrt(variance);
        }
      }
    },
    render: (result) => (
      <div className="analysis-result">
        <strong>Result:</strong> {typeof result === 'number' ? result.toFixed(2) : result}
      </div>
    )
  }
});

// Method 5: Quick mode - auto-builds after render
const quickTool = aui
  .quick('quick-demo')
  .in(z.object({ text: z.string() }))
  .ex(async (input) => input.text.toUpperCase())
  .out((data) => <div className="uppercase">{data}</div>);
// No need to call .build() - it's automatic!

// Method 6: Simple helper for basic tools
const timestampTool = aui.simple(
  'timestamp',
  z.object({ format: z.enum(['iso', 'unix', 'locale']) }),
  (input) => {
    const now = new Date();
    switch (input.format) {
      case 'iso': return now.toISOString();
      case 'unix': return now.getTime();
      case 'locale': return now.toLocaleString();
    }
  },
  (timestamp) => <time>{timestamp}</time>
);

// Method 7: Server-only tool for secure operations
const dbTool = aui.server(
  'database',
  z.object({ 
    table: z.string(),
    operation: z.enum(['count', 'list', 'delete']),
    id: z.string().optional()
  }),
  async (input) => {
    // This runs only on the server, never exposed to client
    console.log('Secure DB operation:', input);
    return { success: true, operation: input.operation };
  },
  (result) => (
    <div className={`db-result ${result.success ? 'success' : 'error'}`}>
      Operation {result.operation} completed
    </div>
  )
);

// Export all tools
export {
  weatherTool,
  calculatorTool,
  searchTool,
  aiTools,
  quickTool,
  timestampTool,
  dbTool
};