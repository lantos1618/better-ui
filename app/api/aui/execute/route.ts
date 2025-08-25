import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

// Import and register example tools
import '@/lib/aui/tools/examples';

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

    const ctx = aui.createContext();
    const data = await tool.run(input, ctx);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

// List available tools
export async function GET() {
  const tools = aui.getTools().map(tool => ({
    name: tool.name,
    schema: tool.schema,
  }));
  
  return NextResponse.json({ tools });
}