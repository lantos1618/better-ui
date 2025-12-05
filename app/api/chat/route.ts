import { openai } from '@ai-sdk/openai';
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { weatherTool, searchTool, counterTool } from '@/lib/tools';

/**
 * API Route - Just import tools and use toAITool()!
 *
 * No duplication - tools are defined ONCE in lib/tools.tsx
 * with .server() handlers and .view() components.
 */

export async function POST(req: Request) {
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
