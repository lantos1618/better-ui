import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const inputSchema = z.object({
  city: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = inputSchema.parse(body);
    
    // Simulate weather API call
    const weatherData = {
      city: input.city,
      temp: Math.floor(Math.random() * 30) + 60,
      condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
      humidity: Math.floor(Math.random() * 40) + 40,
      wind: Math.floor(Math.random() * 20) + 5
    };
    
    return NextResponse.json(weatherData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 }
    );
  }
}