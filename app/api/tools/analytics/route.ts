import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const analyticsSchema = z.object({
  metric: z.enum(['views', 'clicks', 'conversions']),
  period: z.enum(['day', 'week', 'month']),
  groupBy: z.enum(['hour', 'day', 'week']).optional()
});

function generateAnalyticsData(input: z.infer<typeof analyticsSchema>) {
  const points = input.period === 'day' ? 24 : input.period === 'week' ? 7 : 30;
  const baseValue = input.metric === 'views' ? 1000 : input.metric === 'clicks' ? 100 : 10;
  
  return Array.from({ length: points }, (_, i) => ({
    label: input.period === 'day' ? `${i}:00` : `Day ${i + 1}`,
    value: Math.floor(Math.random() * baseValue) + Math.floor(baseValue / 2),
    timestamp: new Date(Date.now() - (points - i) * 3600000).toISOString()
  }));
}

function calculateSummary(data: any[]) {
  const values = data.map(d => d.value);
  return {
    total: values.reduce((a, b) => a + b, 0),
    average: Math.floor(values.reduce((a, b) => a + b, 0) / values.length),
    peak: Math.max(...values),
    low: Math.min(...values)
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = analyticsSchema.parse(body);
    
    // Simulate database query delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const data = generateAnalyticsData(input);
    const summary = calculateSummary(data);
    
    return NextResponse.json({
      metric: input.metric,
      period: input.period,
      groupBy: input.groupBy,
      data,
      summary
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Analytics query failed' },
      { status: 500 }
    );
  }
}