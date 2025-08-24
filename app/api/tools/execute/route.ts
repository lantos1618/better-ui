import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

export async function POST(request: NextRequest) {
  try {
    const { toolName, input } = await request.json();
    
    // Get the tool from registry
    const tool = aui.getTool(toolName);
    
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }
    
    // Validate input
    const validationResult = tool.inputSchema.safeParse(input);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error },
        { status: 400 }
      );
    }
    
    // Execute the tool
    const result = await tool.execute({
      input: validationResult.data,
      ctx: {
        cache: new Map(),
        fetch: async (url: string, options?: RequestInit) => {
          const response = await fetch(url, options);
          return response.json();
        },
        sessionId: request.headers.get('x-session-id') || undefined,
        userId: request.headers.get('x-user-id') || undefined
      }
    });
    
    return NextResponse.json({
      success: true,
      toolName,
      output: result
    });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { 
        error: 'Tool execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// List available tools
export async function GET() {
  const tools = aui.getTools().map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema._def,
    metadata: tool.metadata
  }));
  
  return NextResponse.json({ tools });
}