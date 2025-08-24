import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui/lantos-concise';
import { z } from 'zod';

// Server-side tool definitions
const serverTools = new Map();

// Weather tool (server-only)
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Simulate weather API call
    const temps: Record<string, number> = {
      'San Francisco': 65,
      'New York': 45,
      'Los Angeles': 75,
      'Seattle': 50,
      'Miami': 85,
    };
    return { 
      temp: temps[input.city] || 72,
      city: input.city,
      conditions: 'Partly cloudy',
      humidity: 65
    };
  });

// Search tool (server-side database search)
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate latency
    return {
      results: [
        `Result 1 for "${input.query}"`,
        `Result 2 for "${input.query}"`,
        `Result 3 for "${input.query}"`,
      ],
      total: 3,
      query: input.query
    };
  });

// User tool
const userTool = aui
  .tool('user')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database lookup
    return {
      id: input.userId,
      name: `User ${input.userId}`,
      email: `user${input.userId}@example.com`,
      avatar: `https://avatars.githubusercontent.com/u/${input.userId}?v=4`,
      createdAt: new Date().toISOString()
    };
  });

// Register server tools
serverTools.set('weather', weatherTool);
serverTools.set('search', searchTool);
serverTools.set('user', userTool);

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  try {
    const tool = serverTools.get(params.tool);
    
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${params.tool}" not found` },
        { status: 404 }
      );
    }

    const input = await request.json();
    const result = await tool.run(input);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`Error executing tool ${params.tool}:`, error);
    
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

export async function GET(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  const tool = serverTools.get(params.tool);
  
  if (!tool) {
    return NextResponse.json(
      { error: `Tool "${params.tool}" not found` },
      { status: 404 }
    );
  }

  // Return tool metadata
  return NextResponse.json({
    name: params.tool,
    available: true,
    schema: tool.definition.input?._def || null
  });
}