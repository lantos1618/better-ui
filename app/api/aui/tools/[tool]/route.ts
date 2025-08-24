import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui/aui';

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  try {
    const { tool: toolName } = params;
    const input = await request.json();
    
    // Get the tool from registry
    const tool = aui.get(toolName);
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }
    
    // Execute the tool
    const result = await tool.run(input);
    
    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Tool execution failed' 
      },
      { status: 500 }
    );
  }
}