import { counterTool } from '@/lib/tools';

/**
 * Direct tool execution endpoint
 * Allows client-side UI to call tools without going through the AI
 */

const toolMap = {
  counter: counterTool,
} as const;

export async function POST(req: Request) {
  try {
    const { tool: toolName, input } = await req.json();

    if (!toolName || !input) {
      return Response.json(
        { error: 'Missing tool name or input' },
        { status: 400 }
      );
    }

    const tool = toolMap[toolName as keyof typeof toolMap];
    if (!tool) {
      return Response.json(
        { error: `Unknown tool: ${toolName}` },
        { status: 400 }
      );
    }

    // Execute the tool server-side
    const result = await tool.run(input);

    return Response.json({ result });
  } catch (error) {
    console.error('Tool execution error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Tool execution failed' },
      { status: 500 }
    );
  }
}
