import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';
import { serverTools } from '@/lib/aui/examples/server-actions';

// Register server tools
Object.values(serverTools).forEach(tool => {
  const name = tool.name;
  if (!aui.has(name)) {
    aui.tool(name);
  }
});

export async function POST(request: NextRequest) {
  try {
    const { tool, input } = await request.json();
    
    if (!tool || !input) {
      return NextResponse.json(
        { error: 'Missing tool or input' },
        { status: 400 }
      );
    }
    
    // Execute the tool
    const result = await aui.execute(tool, input, {
      cache: new Map(),
      fetch: fetch,
      isServer: true,
      headers: Object.fromEntries(request.headers.entries()),
      cookies: Object.fromEntries(
        request.cookies.getAll().map(c => [c.name, c.value])
      )
    });
    
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Tool execution failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // List available tools
  const tools = aui.getTools().map(tool => ({
    name: tool.name,
    description: tool.description,
    tags: tool.tags
  }));
  
  return NextResponse.json({ tools });
}