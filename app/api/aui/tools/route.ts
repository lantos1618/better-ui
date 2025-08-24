import { NextRequest, NextResponse } from 'next/server';
import { globalRegistry } from '@/lib/aui/core/registry';
import { z } from 'zod';

// API route for tool discovery and execution
export async function GET() {
  const tools = globalRegistry.list();
  const toolDescriptions = tools.map(tool => ({
    name: tool.name,
    description: tool.description || `Tool: ${tool.name}`,
    inputSchema: tool.inputSchema || {},
    isServerOnly: tool.isServerOnly || false,
    metadata: tool.metadata || {}
  }));
  
  return NextResponse.json({ tools: toolDescriptions });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolName, input, context = {} } = body;
    
    if (!toolName) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      );
    }
    
    const tool = globalRegistry.get(toolName);
    
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }
    
    // Validate input if schema is provided
    if (tool.inputSchema) {
      try {
        tool.inputSchema.parse(input);
      } catch (validationError) {
        return NextResponse.json(
          { 
            error: 'Input validation failed',
            details: validationError instanceof z.ZodError ? validationError.errors : String(validationError)
          },
          { status: 400 }
        );
      }
    }
    
    // Execute the tool
    const result = await tool.execute({
      input,
      ctx: {
        ...context,
        request,
        userId: context.userId || 'anonymous',
        cache: new Map(),
        fetch: async (url: string, opts?: any) => {
          const res = await fetch(url, {
            ...opts,
            headers: {
              'Content-Type': 'application/json',
              ...opts?.headers
            }
          });
          return res.json();
        }
      }
    });
    
    return NextResponse.json({ 
      success: true,
      toolName,
      result 
    });
    
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { 
        error: 'Tool execution failed',
        details: String(error)
      },
      { status: 500 }
    );
  }
}