import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  try {
    const { tool } = params;
    const input = await request.json();
    
    // Create server context
    const ctx = aui.createContext({
      isServer: true,
      headers: Object.fromEntries(request.headers.entries()),
      // Add any server-specific context like database connections
    });
    
    // Execute the tool
    const result = await aui.execute(tool, input, ctx);
    
    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error: any) {
    console.error('Tool execution error:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    // Handle tool not found
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tool not found' 
        },
        { status: 404 }
      );
    }
    
    // Generic error
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  const { tool } = params;
  const auiTool = aui.get(tool);
  
  if (!auiTool) {
    return NextResponse.json(
      { error: 'Tool not found' },
      { status: 404 }
    );
  }
  
  // Return tool metadata
  return NextResponse.json({
    name: auiTool.name,
    description: auiTool.description,
    tags: auiTool.tags,
    hasInput: !!auiTool.schema,
    hasRender: !!auiTool.renderer
  });
}