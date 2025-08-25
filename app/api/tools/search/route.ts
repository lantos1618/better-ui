import { NextRequest, NextResponse } from 'next/server';
import { searchTool } from '@/lib/aui/tools.tsx';

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();
    
    // Execute the search tool on the server
    const result = await searchTool.run(input, {
      cache: new Map(),
      fetch: global.fetch,
      isServer: true
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Search tool error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}