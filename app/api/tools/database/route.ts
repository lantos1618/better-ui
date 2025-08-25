import { NextRequest, NextResponse } from 'next/server';

// Mock database for demo purposes
const mockDatabase = {
  users: [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', createdAt: '2024-01-15' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user', createdAt: '2024-02-20' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'user', createdAt: '2024-03-10' }
  ],
  posts: [
    { id: 1, title: 'Getting Started with AUI', content: 'AUI makes tool calls simple...', authorId: 1, createdAt: '2024-03-01' },
    { id: 2, title: 'Advanced AUI Patterns', content: 'Learn about middleware and caching...', authorId: 1, createdAt: '2024-03-15' },
    { id: 3, title: 'Building AI Assistants', content: 'How to integrate AI with AUI...', authorId: 2, createdAt: '2024-03-20' }
  ],
  comments: [
    { id: 1, postId: 1, userId: 2, content: 'Great introduction!', createdAt: '2024-03-02' },
    { id: 2, postId: 1, userId: 3, content: 'Very helpful, thanks!', createdAt: '2024-03-03' }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, operation, conditions, data, limit } = body;

    // Validate table exists
    if (!mockDatabase[table as keyof typeof mockDatabase]) {
      return NextResponse.json(
        { error: `Table '${table}' not found` },
        { status: 404 }
      );
    }

    const tableData = mockDatabase[table as keyof typeof mockDatabase];

    switch (operation) {
      case 'select': {
        let results = [...tableData];
        
        // Apply conditions
        if (conditions) {
          results = results.filter(row => {
            return Object.entries(conditions).every(([key, value]) => 
              (row as any)[key] === value
            );
          });
        }
        
        // Apply limit
        if (limit) {
          results = results.slice(0, limit);
        }
        
        return NextResponse.json({
          data: results,
          count: results.length,
          table
        });
      }

      case 'insert': {
        if (!data) {
          return NextResponse.json(
            { error: 'Data required for insert operation' },
            { status: 400 }
          );
        }
        
        const newRecord = {
          id: tableData.length + 1,
          ...data,
          createdAt: new Date().toISOString()
        };
        
        return NextResponse.json({
          success: true,
          data: newRecord,
          table
        });
      }

      case 'update': {
        if (!conditions || !data) {
          return NextResponse.json(
            { error: 'Conditions and data required for update operation' },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          updated: 1,
          table
        });
      }

      case 'delete': {
        if (!conditions) {
          return NextResponse.json(
            { error: 'Conditions required for delete operation' },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          deleted: 1,
          table
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Database API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}