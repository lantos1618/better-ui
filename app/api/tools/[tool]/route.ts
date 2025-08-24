import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  try {
    const toolName = params.tool;
    const input = await request.json();
    
    // Get and execute tool on server
    const tool = aui.get(toolName);
    if (!tool) {
      return NextResponse.json(
        { success: false, error: `Tool ${toolName} not found` },
        { status: 404 }
      );
    }
    
    if (!tool.execute) {
      return NextResponse.json(
        { success: false, error: `Tool ${toolName} has no execute handler` },
        { status: 400 }
      );
    }
    
    const result = await tool.execute({ input });
    
    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  const toolName = params.tool;
  const tool = aui.get(toolName);
  
  if (!tool) {
    return NextResponse.json(
      { error: `Tool ${toolName} not found` },
      { status: 404 }
    );
  }
  
  // Return tool metadata
  return NextResponse.json({
    name: tool.name,
    hasClientExecute: !!tool.clientExecute,
    hasRender: !!tool.render
  });
}