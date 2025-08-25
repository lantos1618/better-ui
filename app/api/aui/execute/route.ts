import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';
import { aiControlSystem } from '@/lib/aui/ai-control';
import { z } from 'zod';
import '@/lib/aui/examples/simple-tools'; // Register tools

const executeSchema = z.object({
  tool: z.string(),
  input: z.any(),
  context: z.object({
    user: z.any().optional(),
    session: z.any().optional(),
    env: z.record(z.string()).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool: toolName, input, context } = executeSchema.parse(body);
    
    // Create server context with request details
    const serverContext = {
      ...context,
      isServer: true,
      cache: new Map(),
      fetch: fetch,
      headers: Object.fromEntries(request.headers.entries()),
      cookies: parseCookies(request.headers.get('cookie') || ''),
    };
    
    // Check if it's an AI-controlled tool first
    const aiTool = aiControlSystem.get(toolName);
    if (aiTool) {
      const result = await aiControlSystem.execute(toolName, input, serverContext);
      return NextResponse.json({
        success: true,
        data: result,
        tool: toolName,
        type: 'ai-controlled',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Try regular AUI tool
    const tool = aui.get(toolName);
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }
    
    const result = await tool.run(input, serverContext);
    
    return NextResponse.json({
      success: true,
      data: result,
      tool: toolName,
      type: 'aui',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Tool execution error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const toolName = searchParams.get('tool');
  
  if (toolName) {
    // Get specific tool info
    const aiTool = aiControlSystem.get(toolName);
    const auiTool = aui.get(toolName);
    const tool = aiTool || auiTool;
    
    if (tool) {
      return NextResponse.json({
        name: tool.name,
        description: tool.description,
        tags: tool.tags,
        type: aiTool ? 'ai-controlled' : 'aui',
        config: tool.toJSON(),
      });
    }
    
    return NextResponse.json(
      { error: `Tool "${toolName}" not found` },
      { status: 404 }
    );
  }
  
  // List all available tools
  const aiTools = aiControlSystem.listTools();
  const auiTools = aui.list().map(tool => ({
    name: tool.name,
    description: tool.description,
    tags: tool.tags,
    type: 'aui',
    config: tool.toJSON(),
  }));
  
  return NextResponse.json({
    tools: [
      ...aiTools.map(t => ({ ...t, type: 'ai-controlled' })),
      ...auiTools,
    ],
    count: aiTools.length + auiTools.length,
    message: 'AUI Execute API - List of available tools',
  });
}

function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieString.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key) cookies[key] = value || '';
  });
  return cookies;
}