import { NextRequest, NextResponse } from 'next/server';
import aui, { z } from '@/lib/aui/server';

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
        { error: `Tool ${toolName} not found` },
        { status: 404 }
      );
    }
    
    // Execute the tool with context
    const ctx = aui.createContext();
    const result = await tool.run(input, ctx);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Tool execution error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
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
  
  if (toolName === 'list') {
    // Return all available tools
    return NextResponse.json({
      tools: aui.getToolNames()
    });
  }
  
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
    available: true
  });
}