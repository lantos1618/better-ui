import React from 'react';
import aui, { z } from '../index';

// Complex tool - adds client optimization
const complexSearchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server execution - would query database in production
    return Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      title: `Result for ${input.query} #${i + 1}`,
      score: 0.95 - i * 0.08,
      description: `Match found for search term: ${input.query}`
    }));
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {data.length === 0 ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
          No results found
        </div>
      ) : (
        data.map((item: any) => (
          <div 
            key={item.id} 
            style={{ 
              padding: '1rem', 
              border: '1px solid #e5e7eb', 
              borderRadius: '0.5rem',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontWeight: '600' }}>{item.title}</h4>
              <span style={{ 
                fontSize: '0.875rem', 
                color: '#10b981',
                backgroundColor: '#d1fae5',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem'
              }}>
                {Math.round(item.score * 100)}%
              </span>
            </div>
            {item.description && (
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                {item.description}
              </p>
            )}
            {item.url && (
              <a 
                href={item.url} 
                style={{ 
                  fontSize: '0.75rem', 
                  color: '#3b82f6',
                  textDecoration: 'none',
                  marginTop: '0.25rem',
                  display: 'inline-block'
                }}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.url}
              </a>
            )}
          </div>
        ))
      )}
    </div>
  ))
  .build();

export default complexSearchTool;
export { complexSearchTool };