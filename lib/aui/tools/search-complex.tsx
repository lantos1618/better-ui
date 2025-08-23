import React from 'react';
import { z } from 'zod';
import aui from '../index';

const SearchResults = ({ results }: { results: any[] }) => (
  <div className="space-y-2">
    {results.map((item) => (
      <div key={item.id} className="p-2 border rounded">
        {item.title} <span className="text-gray-500">({item.score})</span>
      </div>
    ))}
  </div>
);

const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // In real app: return await db.search(input.query)
    return [
      { id: 1, title: `Result for ${input.query}`, score: 0.95 },
      { id: 2, title: `Another ${input.query} match`, score: 0.85 }
    ];
  })
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: JSON.stringify(input) });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();

export default searchTool;