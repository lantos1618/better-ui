import aui, { z } from '../index';

// Simple tool - just 2 methods
export const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }));

// With render
export const withRenderTool = aui
  .tool('temperature')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
export const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: database search
    return { results: [`Server result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first, then fetch
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <ul>
      {data.results.map((r, i) => <li key={i}>{r}</li>)}
    </ul>
  ));

// AI control tool
export const aiTool = aui
  .tool('dom-click')
  .input(z.object({ selector: z.string() }))
  .execute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    if (element instanceof HTMLElement) {
      element.click();
      return { success: true, selector: input.selector };
    }
    return { success: false, selector: input.selector };
  });

// With middleware for auth/logging
export const protectedTool = aui
  .tool('user-data')
  .input(z.object({ userId: z.string() }))
  .middleware(async ({ input, ctx, next }) => {
    // Check auth
    if (!ctx.user) throw new Error('Unauthorized');
    // Log access
    console.log(`User ${ctx.user.id} accessing ${input.userId}`);
    return next();
  })
  .execute(async ({ input }) => ({ 
    userId: input.userId, 
    data: 'sensitive data' 
  }));

// Chained/composed tools
export const composedTool = aui
  .tool('weather-report')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Get weather
    const weather = await simpleTool.run({ city: input.city });
    // Get forecast
    const forecast = ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)];
    return { ...weather, forecast };
  })
  .render(({ data }) => (
    <div>
      <h3>{data.city}</h3>
      <p>Current: {data.temp}°</p>
      <p>Forecast: {data.forecast}</p>
    </div>
  ));

// Tagged tools for discovery
export const notificationTool = aui
  .tool('notify')
  .tag('ui', 'notification')
  .describe('Show a notification to the user')
  .input(z.object({ 
    message: z.string(),
    type: z.enum(['info', 'success', 'error']).optional() 
  }))
  .execute(async ({ input }) => {
    // In real app, would show actual notification
    console.log(`[${input.type || 'info'}] ${input.message}`);
    return { shown: true };
  });

// Streaming tool (for Vercel AI SDK)
export const streamingTool = aui
  .tool('generate-text')
  .input(z.object({ prompt: z.string() }))
  .execute(async function* ({ input }) {
    const words = input.prompt.split(' ');
    for (const word of words) {
      await new Promise(r => setTimeout(r, 100));
      yield word + ' ';
    }
  });

// Batch processing tool
export const batchTool = aui
  .tool('batch-process')
  .input(z.object({ items: z.array(z.string()) }))
  .execute(async ({ input }) => {
    const results = await Promise.all(
      input.items.map(async item => {
        // Process each item
        return { item, processed: item.toUpperCase() };
      })
    );
    return { results };
  });

// Error handling
export const errorHandlingTool = aui
  .tool('safe-fetch')
  .input(z.object({ url: z.string().url() }))
  .execute(async ({ input }) => {
    try {
      const response = await fetch(input.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { data: await response.json(), error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })
  .render(({ data }) => (
    <div>
      {data.error ? (
        <p style={{ color: 'red' }}>Error: {data.error}</p>
      ) : (
        <pre>{JSON.stringify(data.data, null, 2)}</pre>
      )}
    </div>
  ));