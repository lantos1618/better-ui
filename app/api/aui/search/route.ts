import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();
    
    // Simulate database search
    await new Promise(r => setTimeout(r, 500));
    
    const results = Array.from({ length: input.limit || 10 }, (_, i) => ({
      id: i + 1,
      title: `Server Result ${i + 1} for "${input.query}"`,
      score: Math.random()
    })).sort((a, b) => b.score - a.score);
    
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}