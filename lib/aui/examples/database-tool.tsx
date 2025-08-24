import React from 'react';
import aui, { z } from '../index';

// Database query tool - server only
const databaseTool = aui
  .tool('database-query')
  .description('Execute database queries')
  .input(z.object({
    table: z.string(),
    filters: z.record(z.any()).optional(),
    limit: z.number().optional().default(10)
  }))
  .serverOnly() // Marks as server-only execution
  .execute(async ({ input }) => {
    // This would connect to your database
    // Example with mock data:
    const results = {
      rows: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        table: input.table,
        data: { example: 'data' }
      })),
      count: input.limit
    };
    return results;
  })
  .render(({ data }) => (
    <div className="database-results">
      <p className="text-sm text-gray-600 mb-2">Found {data.count} rows</p>
      <div className="space-y-2">
        {data.rows.map((row: any) => (
          <div key={row.id} className="p-2 bg-gray-50 rounded">
            <pre className="text-xs">{JSON.stringify(row, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  ))
  .build();

export default databaseTool;