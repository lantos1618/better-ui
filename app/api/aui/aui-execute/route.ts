import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui/aui-concise';
import { z } from 'zod';

// Request schema
const executeRequestSchema = z.object({
  tool: z.string(),
  input: z.any(),
  context: z.object({
    user: z.any().optional(),
    session: z.any().optional(),
    aiAgent: z.string().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, input, context } = executeRequestSchema.parse(body);
    
    // Create server context
    const serverContext = aui.context({
      user: context?.user,
      session: context?.session,
      aiAgent: context?.aiAgent || 'server'
    });
    
    // Execute the tool
    const result = await aui.execute(tool, input, serverContext);
    
    return NextResponse.json({
      success: true,
      data: result,
      tool,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }
    
    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown error'
    }, { status: 500 });
  }
}

// Support for tool discovery
export async function GET() {
  const tools = aui.list();
  
  return NextResponse.json({
    tools,
    count: tools.length,
    timestamp: new Date().toISOString()
  });
}