import { NextRequest, NextResponse } from 'next/server';
import { ToolExecutor } from '@/lib/aui/server/executor';
import { globalRegistry } from '@/lib/aui/core/registry';
import { registerDefaultTools } from '@/lib/aui/tools';
import type { ToolCall } from '@/lib/aui';

// Register default tools on startup
registerDefaultTools();

const executor = new ToolExecutor({
  context: {
    cache: new Map(),
    fetch: globalThis.fetch,
  },
  registry: globalRegistry,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.toolCalls) {
      const toolCalls: ToolCall[] = body.toolCalls;
      const results = await executor.executeBatch(toolCalls);
      return NextResponse.json({ results });
    }
    
    if (!body.toolCall) {
      return NextResponse.json(
        { error: 'Missing toolCall or toolCalls in request body' },
        { status: 400 }
      );
    }

    const toolCall: ToolCall = body.toolCall;
    const result = await executor.execute(toolCall);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute tool', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const tools = globalRegistry.list().map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema._def,
    outputSchema: tool.outputSchema?._def,
    isServerOnly: tool.isServerOnly,
    metadata: tool.metadata,
  }));

  return NextResponse.json({ tools, count: tools.length });
}