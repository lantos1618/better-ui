import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

export async function POST(request: NextRequest) {
  try {
    const { tool: toolName, input } = await request.json();
    
    if (!toolName) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      );
    }

    const tool = aui.get(toolName);
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }

    const result = await tool.run(input);
    
    return NextResponse.json({ 
      success: true,
      tool: toolName,
      result 
    });
  } catch (error) {
    console.error('AUI execution error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Execution failed',
        details: error
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const tools = aui.getTools().map(tool => ({
    name: tool.name,
    schema: tool.schema
  }));
  return NextResponse.json({ 
    tools,
    count: tools.length 
  });
}