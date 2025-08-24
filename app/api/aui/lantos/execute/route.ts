import { NextRequest, NextResponse } from 'next/server';
import { aui } from '@/lib/aui/lantos';
import { z } from 'zod';

// Schema for the tool execution request
const ExecuteRequestSchema = z.object({
  tool: z.string(),
  input: z.any()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool: toolName, input } = ExecuteRequestSchema.parse(body);
    
    // Get the tool from the registry
    const tool = aui.get(toolName);
    if (!tool) {
      return NextResponse.json(
        { error: `Tool '${toolName}' not found` },
        { status: 404 }
      );
    }
    
    // Validate input against tool's schema
    let validatedInput;
    try {
      validatedInput = tool.inputSchema.parse(input);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid input', details: error },
        { status: 400 }
      );
    }
    
    // Execute the tool
    const result = await tool.execute({ 
      input: validatedInput,
      ctx: {
        cache: new Map(),
        fetch: fetch.bind(null),
        user: null, // Could be populated from session
        session: null
      }
    });
    
    return NextResponse.json({
      success: true,
      tool: toolName,
      result
    });
    
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { error: 'Tool execution failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to list available tools
export async function GET() {
  const tools = aui.list().map(tool => ({
    name: tool.name,
    input: tool.inputSchema._def,
    metadata: tool.metadata
  }));
  
  return NextResponse.json({ tools });
}