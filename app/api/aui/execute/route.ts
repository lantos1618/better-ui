import { NextRequest, NextResponse } from 'next/server';
import { aui } from '@/lib/aui/lantos-aui';

export async function POST(request: NextRequest) {
  try {
    const { tool, input } = await request.json();
    
    if (!tool || typeof tool !== 'string') {
      return NextResponse.json(
        { error: 'Tool name is required' },
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
    
    // Create server context
    const ctx = aui.createContext({
      user: request.headers.get('x-user-id') || undefined,
      session: request.headers.get('x-session-id') || undefined,
    });
    
    const result = await toolInstance.run(input, ctx);
    
    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error: any) {
    console.error('Tool execution error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}