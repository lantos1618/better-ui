import React from 'react';
import { z } from 'zod';
import aui from '../ultra-concise';

// ============================================================================
// 🚀 LANTOS ULTRA-CONCISE AUI API SHOWCASE
// ============================================================================
// The most elegant way to create AI-powered tools in Next.js/Vercel
// No .build() needed - tools auto-finalize when complete!
// ============================================================================

// -----------------------------------------------------------------------------
// 1️⃣ SIMPLE PATTERN: Just 2 methods (execute + render)
// -----------------------------------------------------------------------------
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(Math.random() * 30 + 60), 
    city: input.city 
  }))
  .render(({ data }) => (
    <div className="weather-card">
      <h3>{data.city}</h3>
      <p>{data.temp}°F</p>
    </div>
  ));

// -----------------------------------------------------------------------------
// 2️⃣ COMPLEX PATTERN: With client-side optimization
// -----------------------------------------------------------------------------
const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side: Database query
    console.log(`[Server] Searching for: ${input.query}`);
    return {
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i,
        title: `Result ${i + 1} for "${input.query}"`,
        score: Math.random()
      }))
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: Check cache first, then fetch
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache?.get(cacheKey);
    
    if (cached) {
      console.log(`[Client] Cache hit for: ${input.query}`);
      return cached;
    }
    
    console.log(`[Client] Cache miss, fetching: ${input.query}`);
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    ctx.cache?.set(cacheKey, result);
    return result;
  })
  .render(({ data }) => (
    <div className="search-results">
      {data.results.map(r => (
        <div key={r.id} className="result-item">
          <h4>{r.title}</h4>
          <span>Score: {r.score.toFixed(2)}</span>
        </div>
      ))}
    </div>
  ));

// -----------------------------------------------------------------------------
// 3️⃣ MINIMAL PATTERN: Type inference, no explicit input schema
// -----------------------------------------------------------------------------
const greetTool = aui
  .tool('greet')
  .execute(async (input: { name: string; formal?: boolean }) => {
    return input.formal 
      ? `Good day, ${input.name}. How may I assist you?`
      : `Hey ${input.name}! What's up?`;
  })
  .render(({ data }) => <p className="greeting">{data}</p>);

// -----------------------------------------------------------------------------
// 4️⃣ DATA-ONLY PATTERN: No render method (for API/data tools)
// -----------------------------------------------------------------------------
const databaseTool = aui
  .tool('database')
  .input(z.object({
    table: z.string(),
    operation: z.enum(['select', 'insert', 'update', 'delete']),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    console.log(`[DB] ${input.operation} on ${input.table}`);
    return {
      success: true,
      operation: input.operation,
      table: input.table,
      affectedRows: Math.floor(Math.random() * 100)
    };
  });

// -----------------------------------------------------------------------------
// 5️⃣ STREAMING PATTERN: Real-time data updates
// -----------------------------------------------------------------------------
const streamTool = aui
  .tool('stream')
  .input(z.object({ topic: z.string() }))
  .execute(async function* ({ input }) {
    // Generator function for streaming
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      yield { 
        message: `Update ${i + 1} for ${input.topic}`,
        timestamp: new Date().toISOString()
      };
    }
  } as any)
  .render(({ data }) => (
    <div className="stream-update">
      <time>{data.timestamp}</time>
      <p>{data.message}</p>
    </div>
  ));

// -----------------------------------------------------------------------------
// 6️⃣ FILE UPLOAD PATTERN: Handle files with validation
// -----------------------------------------------------------------------------
const uploadTool = aui
  .tool('upload')
  .input(z.object({
    file: z.object({
      name: z.string(),
      size: z.number(),
      type: z.string()
    }),
    purpose: z.enum(['avatar', 'document', 'media'])
  }))
  .execute(async ({ input }) => {
    // Validate file constraints
    const maxSize = { avatar: 5_000_000, document: 10_000_000, media: 50_000_000 };
    if (input.file.size > maxSize[input.purpose]) {
      throw new Error(`File too large for ${input.purpose}`);
    }
    
    return {
      url: `/uploads/${input.purpose}/${input.file.name}`,
      size: input.file.size,
      type: input.file.type,
      uploaded: new Date().toISOString()
    };
  })
  .render(({ data }) => (
    <div className="upload-result">
      <a href={data.url}>📎 {data.url}</a>
      <small>Uploaded: {data.uploaded}</small>
    </div>
  ));

// -----------------------------------------------------------------------------
// 7️⃣ CHAT PATTERN: Conversational AI tool
// -----------------------------------------------------------------------------
const chatTool = aui
  .tool('chat')
  .input(z.object({
    message: z.string(),
    context: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string()
    })).optional()
  }))
  .execute(async ({ input }) => {
    // Simulate AI response
    const responses = [
      "That's an interesting point!",
      "I understand. Let me help you with that.",
      "Could you tell me more about what you mean?",
      "Here's what I think about that..."
    ];
    
    return {
      response: responses[Math.floor(Math.random() * responses.length)],
      confidence: Math.random(),
      tokens: Math.floor(Math.random() * 100 + 50)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: Add to conversation history
    const history = ctx.conversationHistory || [];
    history.push({ role: 'user', content: input.message });
    
    const response = await ctx.fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: input.message, history })
    });
    
    history.push({ role: 'assistant', content: response.response });
    ctx.conversationHistory = history;
    
    return response;
  })
  .render(({ data }) => (
    <div className="chat-response">
      <p>{data.response}</p>
      <small>Confidence: {(data.confidence * 100).toFixed(1)}% | Tokens: {data.tokens}</small>
    </div>
  ));

// -----------------------------------------------------------------------------
// 8️⃣ ULTRA-SHORT PATTERN: Using the .t() alias
// -----------------------------------------------------------------------------
const quickTool = aui
  .t('quick')
  .execute(async () => ({ 
    fact: "The .t() alias makes tool creation even more concise!",
    timestamp: Date.now()
  }))
  .render(({ data }) => <blockquote>{data.fact}</blockquote>);

// -----------------------------------------------------------------------------
// 🎯 EXPORT ALL TOOLS
// -----------------------------------------------------------------------------
export const tools = {
  weather: weatherTool,
  search: searchTool,
  greet: greetTool,
  database: databaseTool,
  stream: streamTool,
  upload: uploadTool,
  chat: chatTool,
  quick: quickTool
};

// -----------------------------------------------------------------------------
// 🎨 USAGE EXAMPLE COMPONENT
// -----------------------------------------------------------------------------
export const AUIShowcase: React.FC = () => {
  return (
    <div className="aui-showcase">
      <h1>🚀 Lantos Ultra-Concise AUI API</h1>
      
      <section>
        <h2>Simple Weather Tool</h2>
        <pre>{`aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}</pre>
        <p>✨ No .build() needed - auto-finalizes when complete!</p>
      </section>
      
      <section>
        <h2>Complex Search Tool</h2>
        <pre>{`aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}</pre>
        <p>🎯 Client-side optimization for caching and offline support</p>
      </section>
      
      <section>
        <h2>Key Features</h2>
        <ul>
          <li>✅ No .build() method required</li>
          <li>✅ Auto-registration with global registry</li>
          <li>✅ Type-safe with TypeScript and Zod</li>
          <li>✅ Server and client execution paths</li>
          <li>✅ React component rendering</li>
          <li>✅ Ultra-concise .t() alias</li>
          <li>✅ Smart parameter detection</li>
          <li>✅ Context support for caching/auth</li>
        </ul>
      </section>
    </div>
  );
};

export default AUIShowcase;