import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { tool, input } = await request.json();
    
    if (!tool || !input) {
      return NextResponse.json(
        { error: 'Missing tool or input' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tool execution API',
      tool,
      receivedInput: input
    });
  } catch (error: any) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Tool execution failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Tools API endpoint',
    endpoints: ['GET /api/tools', 'POST /api/tools']
  });
}