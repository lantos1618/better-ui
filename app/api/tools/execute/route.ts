import { NextRequest, NextResponse } from 'next/server';
import { handleToolExecution } from '@/lib/aui/lantos/server';

// Import and register example tools
import '@/lib/aui/lantos/examples';

export async function POST(request: NextRequest) {
  return handleToolExecution(request);
}

// List available tools
export async function GET() {
  const { aui } = await import('@/lib/aui/lantos');
  const tools = aui.getTools().map(tool => ({
    name: tool.name,
    schema: tool.schema,
  }));
  
  return NextResponse.json({ tools });
}