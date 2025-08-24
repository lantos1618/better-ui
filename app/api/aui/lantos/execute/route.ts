import { NextRequest, NextResponse } from 'next/server';
import { aui } from '@/lib/aui/lantos';

export async function POST(request: NextRequest) {
  try {
    const { tool: toolName, input } = await request.json();
    
    // Get the tool from the registry
    const tool = aui.get(toolName);
    
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }
    
    // Execute the tool (validation happens inside run)
    const result = await tool.run(input);
    
    return NextResponse.json({ 
      success: true,
      result,
      tool: toolName
    });
    
  } catch (error) {
    console.error('AUI execution error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return list of available tools
  const tools = aui.getTools().map((tool: any) => ({
    name: tool.name,
    hasClientExecute: !!tool.clientExecute,
    metadata: tool.metadata
  }));
  
  return NextResponse.json({ tools });
}