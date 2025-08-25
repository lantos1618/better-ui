import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json();
    
    // Simulate database search on server
    const results = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `server-result-${i}`,
      title: `${query} result ${i + 1}`,
      description: `Server-side search result for "${query}"`,
      score: 1 - (i * 0.1),
      timestamp: new Date().toISOString()
    }));
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return NextResponse.json({
      query,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Search tool error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}