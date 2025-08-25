import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';
import { createServerContext } from '@/lib/aui/server';

// Import and register example tools
import '@/lib/aui/examples';

export async function POST(request: NextRequest) {
  try {
    const { tool: toolName, input, context: contextAdditions } = await request.json();
    
    const tool = aui.get(toolName);
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }

    // Create server context with Next.js integration
    const ctx = await createServerContext(contextAdditions);
    
    // Add request-specific context
    ctx.headers = Object.fromEntries(request.headers.entries());
    
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
    description: tool.description,
    tags: tool.tags,
    hasInput: !!tool.schema,
    hasRender: !!tool.renderer,
  }));
  
  return NextResponse.json({ tools });
}

// Batch execution endpoint
export async function PUT(request: NextRequest) {
  try {
    const { executions } = await request.json();
    
    if (!Array.isArray(executions)) {
      return NextResponse.json(
        { error: 'Executions must be an array' },
        { status: 400 }
      );
    }
    
    const ctx = await createServerContext();
    
    const results = await Promise.allSettled(
      executions.map(async ({ tool: toolName, input }) => {
        const tool = aui.get(toolName);
        if (!tool) {
          throw new Error(`Tool "${toolName}" not found`);
        }
        return tool.run(input, ctx);
      })
    );
    
    const response = results.map((result, index) => ({
      tool: executions[index].tool,
      ...(result.status === 'fulfilled'
        ? { success: true, data: result.value }
        : { success: false, error: result.reason?.message || 'Unknown error' }),
    }));
    
    return NextResponse.json({ results: response });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}