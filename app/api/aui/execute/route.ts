import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { tool: toolName, input } = await request.json();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tool execution endpoint - server implementation',
      tool: toolName,
      receivedInput: input
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'AUI Execute API',
    endpoints: ['POST /api/aui/execute']
  });
}