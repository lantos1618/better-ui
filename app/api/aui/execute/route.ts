import { NextRequest, NextResponse } from 'next/server';
import { aui } from '@/lib/aui';

export async function POST(request: NextRequest) {
  try {
    const { toolName, input } = await request.json();
    
    // Get tool from registry
    const tool = aui.getTool(toolName);
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }
    
    // Execute server-side
    const result = await tool.execute({ input, ctx: {
      cache: new Map(),
      fetch: async (url: string, options?: any) => {
        const res = await fetch(url, options);
        return res.json();
      }
    } as any });
    
    return NextResponse.json({
      success: true,
      toolName,
      result
    });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { error: 'Tool execution failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}