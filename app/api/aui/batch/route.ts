import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { executions } = await request.json();
    
    if (!Array.isArray(executions)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected array of executions.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Batch execution endpoint',
      receivedExecutions: executions.length,
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