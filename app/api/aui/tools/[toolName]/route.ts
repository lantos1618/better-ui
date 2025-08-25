import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

// Server-side tool execution handler
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> }
) {
  try {
    const { toolName } = await params;
    const input = await request.json();
    
    // Get the tool from the registry
    const tool = aui.get(toolName);
    
    if (!tool) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Tool "${toolName}" not found` 
        },
        { status: 404 }
      );
    }
    
    // Create server context
    const context = aui.createContext({
      isServer: true,
      headers: Object.fromEntries(request.headers.entries()),
      // Add any additional server context here
    });
    
    // Execute the tool
    const result = await tool.run(input, context);
    
    return NextResponse.json({ 
      success: true,
      tool: toolName,
      result
    });
    
  } catch (error: any) {
    const { toolName } = await params;
    console.error(`Tool execution error for ${toolName}:`, error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Get tool metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> }
) {
  const { toolName } = await params;
  
  const tool = aui.get(toolName);
  
  if (!tool) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Tool "${toolName}" not found` 
      },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    tool: tool.toJSON()
  });
}