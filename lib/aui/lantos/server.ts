import { NextRequest, NextResponse } from 'next/server';
import { aui } from '../lantos';

export async function handleToolExecution(req: NextRequest) {
  try {
    const { tool, input } = await req.json();
    
    if (!tool || !input) {
      return NextResponse.json(
        { error: 'Missing tool name or input' },
        { status: 400 }
      );
    }

    const toolInstance = aui.get(tool);
    if (!toolInstance) {
      return NextResponse.json(
        { error: `Tool "${tool}" not found` },
        { status: 404 }
      );
    }

    const context = aui.createContext({
      user: req.headers.get('x-user-id') || undefined,
      session: req.headers.get('x-session-id') || undefined,
    });

    const result = await toolInstance.run(input, context);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export function createToolRoute(toolName: string) {
  return async (req: NextRequest) => {
    const input = await req.json();
    return handleToolExecution(new NextRequest(req.url, {
      method: 'POST',
      body: JSON.stringify({ tool: toolName, input }),
      headers: req.headers,
    }));
  };
}