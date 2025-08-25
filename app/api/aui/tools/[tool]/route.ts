import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  try {
    const toolName = params.tool;
    const tool = aui.get(toolName);
    
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const context = aui.createContext({
      user: body.user,
      session: body.session,
      env: process.env as Record<string, string>
    });

    const result = await tool.run(body.input || {}, context);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Tool execution failed' },
      { status: 400 }
    );
  }
}