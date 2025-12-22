import { openai } from '@ai-sdk/openai';
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { weatherTool, searchTool, counterTool } from '@/lib/tools';
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 
             'anonymous';

  if (!rateLimiter.check(ip)) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  const { messages } = await req.json();

  // AI SDK v5: Convert UIMessage[] from client to ModelMessage[] for streamText
  const modelMessages = convertToModelMessages(messages);

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages: modelMessages,
    tools: {
      // Use Better UI's toAITool() - that's it!
      weather: weatherTool.toAITool(),
      search: searchTool.toAITool(),
      counter: counterTool.toAITool(),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
