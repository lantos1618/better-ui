import { NextRequest, NextResponse } from 'next/server';
import { handleToolRequest } from '@/lib/aui/server';
import aui from '@/lib/aui';

// Import and register example tools
import '@/lib/aui/examples';

export async function POST(request: NextRequest) {
  // Use the handleToolRequest from server.ts
  return handleToolRequest(request as unknown as Request);
}

// List available tools
export async function GET() {
  const tools = aui.getTools().map(tool => ({
    name: tool.name,
    schema: tool.schema,
  }));
  
  return NextResponse.json({ tools });
}