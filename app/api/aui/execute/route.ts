import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

export async function POST(request: NextRequest) {
  try {
    const { tool, input, context } = await request.json();
    
    if (!tool) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      );
    }
    
    // Execute the tool
    const result = await aui.execute(tool, input, context);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Tool execution error:', error);
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Support batch execution
export async function PUT(request: NextRequest) {
  try {
    const { tools, context } = await request.json();
    
    if (!Array.isArray(tools)) {
      return NextResponse.json(
        { error: 'Tools must be an array' },
        { status: 400 }
      );
    }
    
    // Batch execute
    const results = await aui.batch(tools, context);
    
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Batch execution error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// List available tools for AI discovery
export async function GET() {
  const tools = aui.list();
  return NextResponse.json({ tools });
}