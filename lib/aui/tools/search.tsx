import { z } from 'zod';
import aui from '../index';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  relevance: number;
}

const searchTool = aui
  .tool('search')
  .description('Search for content')
  .input(z.object({ 
    query: z.string().min(1).describe('Search query'),
    limit: z.number().optional().default(10).describe('Maximum results'),
  }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const results: SearchResult[] = Array.from({ length: input.limit }, (_, i) => ({
      id: `result-${i}`,
      title: `${input.query} result ${i + 1}`,
      description: `This is a search result for "${input.query}". Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      url: `https://example.com/search/${input.query.replace(/\s+/g, '-')}/${i + 1}`,
      relevance: Math.random(),
    })).sort((a, b) => b.relevance - a.relevance);
    
    return { results, query: input.query, total: results.length };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) {
      console.log('Using cached search results');
      return cached;
    }
    
    const result = await ctx.fetch('/api/aui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolCall: {
          id: crypto.randomUUID(),
          toolName: 'search',
          input,
        },
      }),
    });
    
    const data = result.output;
    ctx.cache.set(cacheKey, data);
    
    return data;
  })
  .render(({ data }) => (
    <div className="search-results space-y-3">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Search Results for &quot;{data.query}&quot;
        </h3>
        <span className="text-sm text-gray-500">
          {data.total} results
        </span>
      </div>
      <div className="space-y-2">
        {data.results.map((result: SearchResult) => (
          <div key={result.id} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
            <h4 className="font-medium text-blue-600 hover:underline">
              <a href={result.url} target="_blank" rel="noopener noreferrer">
                {result.title}
              </a>
            </h4>
            <p className="text-sm text-gray-600 mt-1">{result.description}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">{result.url}</span>
              <span className="text-xs text-green-600">
                {Math.round(result.relevance * 100)}% relevant
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ))
  .build();

export default searchTool;