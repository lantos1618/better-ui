import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';
import '@/lib/aui/examples/simple-tools'; // Register tools

export async function POST(request: NextRequest) {
  try {
    const { tool: toolName, input } = await request.json();
    
    const tool = aui.get(toolName);
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }
    
    const result = await tool.run(input, aui.createContext({ isServer: true }));
    
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'AUI Execute API',
    endpoints: ['POST /api/aui/execute']
  });
}