import React from 'react';
import { z } from 'zod';
import aui from '../index';

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }: { input: any }) => {
    // Server-side execution (could be db.search in real app)
    return [
      { id: 1, title: `Result for ${input.query}`, score: 0.95 },
      { id: 2, title: `Another ${input.query} match`, score: 0.87 }
    ];
  })
  .clientExecute(async ({ input, ctx }: { input: any; ctx: any }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }: { data: any }) => (
    <div className="search-results">
      {data.map((item: any) => (
        <div key={item.id} className="result-item">
          <h4>{item.title}</h4>
          <span className="score">{(item.score * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  ))
  .build();

export default complexTool;