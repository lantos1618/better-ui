import { NextRequest, NextResponse } from 'next/server';
import aui, { z } from '@/lib/aui/index-concise';

// Register server-side tools
const serverTools = {
  database: aui
    .tool('database')
    .input(z.object({
      table: z.string(),
      operation: z.enum(['create', 'read', 'update', 'delete']),
      data: z.record(z.any()).optional()
    }))
    .execute(async ({ input }) => {
      // Simulated database operations
      const operations = {
        create: () => ({ id: Date.now(), ...input.data, created: new Date() }),
        read: () => ({ id: 1, name: 'Sample Record', table: input.table }),
        update: () => ({ id: 1, ...input.data, updated: new Date() }),
        delete: () => ({ deleted: true, table: input.table, timestamp: new Date() })
      };
      
      return operations[input.operation]();
    })
    .build(),

  analytics: aui
    .tool('analytics')
    .input(z.object({
      metric: z.string(),
      timeframe: z.enum(['day', 'week', 'month', 'year'])
    }))
    .execute(async ({ input }) => {
      // Simulated analytics data
      const data = {
        metric: input.metric,
        timeframe: input.timeframe,
        value: Math.floor(Math.random() * 10000),
        trend: Math.random() > 0.5 ? 'up' : 'down',
        percentage: (Math.random() * 20 - 10).toFixed(2)
      };
      return data;
    })
    .build(),

  aiModel: aui
    .tool('ai-model')
    .input(z.object({
      prompt: z.string(),
      model: z.enum(['gpt-4', 'claude', 'llama']).optional(),
      temperature: z.number().optional()
    }))
    .execute(async ({ input }) => {
      // Simulated AI response
      const responses = [
        `Based on your prompt "${input.prompt}", here's my analysis...`,
        `Processing request with ${input.model || 'default'} model...`,
        `Generated response for: "${input.prompt}"`
      ];
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        model: input.model || 'gpt-4',
        tokens: Math.floor(Math.random() * 1000),
        temperature: input.temperature || 0.7
      };
    })
    .build()
};

// Register all server tools
Object.values(serverTools).forEach(tool => aui.register(tool));

export async function POST(request: NextRequest) {
  try {
    const { toolName, input } = await request.json();
    
    const tool = aui.get(toolName);
    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }

    // Execute the tool
    const result = await tool.execute({
      input,
      ctx: {
        cache: new Map(),
        fetch: async (url: string, options?: any) => {
          const response = await fetch(url, options);
          return response.json();
        },
        request,
        headers: Object.fromEntries(request.headers.entries())
      }
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('AUI execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // List available tools
  const tools = aui.list().map(tool => ({
    name: tool.name,
    hasClientExecution: !!tool.clientExecute
  }));
  
  return NextResponse.json({ tools });
}