import { streamText, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/db';
import { messages, threads, toolCalls } from '@/db/schema';
import { tools } from '@/lib/tools';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const body = await req.json() as {
    messages: Array<{ role: string; content: string }>;
    threadId: string;
  };

  const { threadId } = body;

  // Ensure thread exists
  const thread = db.select().from(threads).where(eq(threads.id, threadId)).get();
  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 });
  }

  // Save the user message
  const userMsg = body.messages[body.messages.length - 1];
  if (userMsg && userMsg.role === 'user') {
    db.insert(messages).values({
      id: randomUUID(),
      threadId,
      role: 'user',
      content: userMsg.content,
    }).run();
  }

  // Update thread timestamp
  db.update(threads)
    .set({ updatedAt: new Date() })
    .where(eq(threads.id, threadId))
    .run();

  // Auto-title on first message
  if (!thread.title || thread.title === 'New Chat') {
    const preview = userMsg?.content.slice(0, 50) || 'New Chat';
    db.update(threads)
      .set({ title: preview })
      .where(eq(threads.id, threadId))
      .run();
  }

  const modelMessages = convertToModelMessages(body.messages);

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages: modelMessages,
    tools: Object.fromEntries(
      Object.entries(tools).map(([name, t]) => [name, t.toAITool()])
    ),
    async onFinish({ text, toolCalls: calls }) {
      // Persist the assistant message
      const assistantMsgId = randomUUID();
      if (text) {
        db.insert(messages).values({
          id: assistantMsgId,
          threadId,
          role: 'assistant',
          content: text,
        }).run();
      }

      // Persist tool calls
      if (calls && calls.length > 0) {
        for (const call of calls) {
          db.insert(toolCalls).values({
            id: call.toolCallId,
            messageId: assistantMsgId,
            toolName: call.toolName,
            input: JSON.stringify(call.args),
            output: null,
            state: 'completed',
          }).run();
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

// GET: Load thread messages
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('threadId');

  if (!threadId) {
    return Response.json({ error: 'Missing threadId' }, { status: 400 });
  }

  const threadMessages = db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .all();

  return Response.json(threadMessages);
}
