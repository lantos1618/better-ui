import { NextRequest, NextResponse } from 'next/server';

// Mock database search function
async function searchDatabase(query: string, limit: number = 10) {
  // Simulate database latency
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate mock results based on query
  const results = Array.from({ length: limit }, (_, i) => ({
    id: `result-${i + 1}`,
    title: `${query} - Result ${i + 1}`,
    description: `This is a detailed description for search result ${i + 1} matching "${query}"`,
    url: `https://example.com/results/${i + 1}`,
    relevance: Math.random(),
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
  }));
  
  // Sort by relevance
  return results.sort((a, b) => b.relevance - a.relevance);
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      );
    }
    
    const results = await searchDatabase(query, limit);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}