import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui/lantos';

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
    
    // Validate input
    const validatedInput = tool.inputSchema.parse(input);
    
    // Execute the tool (server-side only)
    const result = await tool.execute({ input: validatedInput });
    
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
  const tools = aui.list().map(tool => ({
    name: tool.name,
    hasClientExecute: !!tool.clientExecute,
    metadata: tool.metadata
  }));
  
  return NextResponse.json({ tools });
}