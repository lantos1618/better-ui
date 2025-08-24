import { NextRequest, NextResponse } from 'next/server';
import { aui } from '@/lib/aui/lantos-refined';
import { allTools } from '@/lib/aui/examples/lantos-clean';

// Initialize tools on server startup
allTools.forEach(tool => aui.register(tool));

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  try {
    const toolName = params.tool;
    const input = await request.json();
    
    // Execute tool on server
    const result = await aui.execute(toolName, input);
    
    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  const toolName = params.tool;
  const tool = aui.getTool(toolName);
  
  if (!tool) {
    return NextResponse.json(
      { error: `Tool ${toolName} not found` },
      { status: 404 }
    );
  }
  
  // Return tool metadata
  return NextResponse.json({
    name: tool.name,
    hasClientExecute: !!tool.clientExecute,
    hasRender: !!tool.render
  });
}