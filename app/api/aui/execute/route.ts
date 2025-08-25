import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui/server';

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

    if (!tool.execute) {
      return NextResponse.json(
        { error: `Tool "${toolName}" has no execute handler` },
        { status: 400 }
      );
    }

    // Validate input if schema is provided
    if (tool.inputSchema) {
      const validation = tool.inputSchema.safeParse(input);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error.errors },
          { status: 400 }
        );
      }
    }

    // Execute the tool
    const result = await tool.execute({ input });

    return NextResponse.json({ 
      success: true, 
      result,
      tool: toolName 
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