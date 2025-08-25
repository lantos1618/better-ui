import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  try {
    const { tool } = params;
    const input = await request.json();
    
    return NextResponse.json({ 
      success: true, 
      message: `Tool ${tool} execution endpoint`,
      tool,
      receivedInput: input
    });
  } catch (error: any) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  const { tool } = params;
  
  return NextResponse.json({
    message: `Tool ${tool} metadata endpoint`,
    tool
  });
}