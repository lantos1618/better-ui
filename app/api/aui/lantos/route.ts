import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui/lantos-aui';

export async function POST(request: NextRequest) {
  try {
    const { tool: toolName, input } = await request.json();
    
    // Get the tool from the registry
    const tool = aui.get(toolName);
    
    if (!tool) {
      return NextResponse.json(
        { error: `Tool '${toolName}' not found` },
        { status: 404 }
      );
    }
    
    // Create a server context
    const ctx = {
      cache: new Map(),
      fetch: async (url: string, options?: any) => {
        const res = await fetch(url, options);
        return res.json();
      },
      // Add request context if needed
      user: request.headers.get('x-user-id'),
      session: request.headers.get('x-session-id'),
    };
    
    // Execute the tool
    const result = await tool.run(input, ctx);
    
    return NextResponse.json({ 
      success: true, 
      data: result,
      tool: toolName 
    });
  } catch (error: any) {
    console.error('Tool execution error:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Tool execution failed',
        tool: request.body 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list available tools
export async function GET() {
  const tools = aui.getTools().map(tool => ({
    name: tool.name,
    hasInput: !!tool.inputSchema,
    metadata: tool.metadata,
  }));
  
  return NextResponse.json({ tools });
}