import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

interface RouteParams {
  params: {
    toolName: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { toolName } = params;
    const input = await request.json();
    
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
    
    // Create context
    const ctx = {
      cache: new Map(),
      fetch: async (url: string, options?: RequestInit) => {
        const response = await fetch(url, options);
        return response.json();
      },
      sessionId: request.headers.get('x-session-id') || undefined,
      userId: request.headers.get('x-user-id') || undefined
    };
    
    // Execute the tool
    const result = await tool.execute({
      input: validationResult.data,
      ctx
    });
    
    return NextResponse.json({
      success: true,
      toolName,
      output: result
    });
  } catch (error) {
    console.error(`Tool ${params.toolName} execution error:`, error);
    return NextResponse.json(
      { 
        error: 'Tool execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get tool information
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { toolName } = params;
  const tool = aui.getTool(toolName);
  
  if (!tool) {
    return NextResponse.json(
      { error: `Tool "${toolName}" not found` },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema._def,
    outputSchema: tool.outputSchema?._def,
    isServerOnly: tool.isServerOnly,
    metadata: tool.metadata
  });
}