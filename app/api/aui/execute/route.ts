import { NextRequest, NextResponse } from 'next/server';
import { handleToolRequest } from '@/lib/aui/server';
import aui from '@/lib/aui';

export async function POST(request: NextRequest) {
  // Convert NextRequest to standard Request for handleToolRequest
  const body = await request.json();
  const standardRequest = new Request(request.url, {
    method: 'POST',
    headers: Object.fromEntries(request.headers.entries()),
    body: JSON.stringify(body)
  });
  
  const response = await handleToolRequest(standardRequest);
  const data = await response.json();
  
  return NextResponse.json(data, { status: response.status });
}

export async function GET() {
  const tools = aui.list().map(tool => ({
    name: tool.name,
    hasSchema: !!tool.schema,
    hasRenderer: !!tool.renderer
  }));
  
  return NextResponse.json({
    message: 'AUI Tool Execution API',
    availableTools: tools,
    usage: {
      method: 'POST',
      body: {
        tool: 'toolName',
        input: 'toolInput',
        context: 'optionalContext'
      }
    }
  });
}