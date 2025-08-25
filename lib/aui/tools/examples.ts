import aui, { z } from '../index';

export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({
    city: input.city,
    temperature: Math.floor(Math.random() * 30 + 50),
    condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
  }));

export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${input.query}"`,
      url: `https://example.com/${i + 1}`
    }));
  });

export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({ expression: z.string() }))
  .execute(async ({ input }) => {
    try {
      // Simple safe evaluation for demo
      const result = Function('"use strict"; return (' + input.expression + ')')();
      return { expression: input.expression, result };
    } catch {
      throw new Error('Invalid expression');
    }
  });

export const dataFetcherTool = aui
  .tool('dataFetcher')
  .input(z.object({ url: z.string().url() }))
  .execute(async ({ input }) => {
    const response = await fetch(input.url);
    return response.json();
  });