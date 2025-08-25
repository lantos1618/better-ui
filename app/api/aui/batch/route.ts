import { NextRequest, NextResponse } from 'next/server';
import aui from '@/lib/aui';
import { aiControlSystem } from '@/lib/aui/ai-control';

export async function POST(request: NextRequest) {
  try {
    const { executions } = await request.json();
    
    if (!Array.isArray(executions)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected array of executions.' },
        { status: 400 }
      );
    }
    
    const ctx = aui.createContext({
      isServer: true,
      headers: Object.fromEntries(request.headers.entries()),
    });
    
    const results = await Promise.allSettled(
      executions.map(async (exec) => {
        const { tool, input } = exec;
        
        // Try AI control system first
        if (aiControlSystem.get(tool)) {
          return await aiControlSystem.execute(tool, input, ctx);
        }
        
        // Fall back to regular AUI
        return await aui.execute(tool, input, ctx);
      })
    );
    
    const response = results.map((result, index) => ({
      tool: executions[index].tool,
      ...(result.status === 'fulfilled'
        ? { success: true, data: result.value }
        : { success: false, error: result.reason?.message || 'Unknown error' }),
    }));
    
    return NextResponse.json({ 
      success: true, 
      results: response,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}