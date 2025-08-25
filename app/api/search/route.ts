import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  
  const mockResults = {
    query,
    items: [
      { id: 1, title: `Result 1 for "${query}"`, description: 'First search result' },
      { id: 2, title: `Result 2 for "${query}"`, description: 'Second search result' },
      { id: 3, title: `Result 3 for "${query}"`, description: 'Third search result' },
    ],
    total: 3,
    timestamp: new Date().toISOString()
  };
  
  return NextResponse.json(mockResults);
}