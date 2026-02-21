import { db } from '@/db';
import { threads, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { UIMessage } from 'ai';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rows = db
    .select()
    .from(messages)
    .where(eq(messages.threadId, id))
    .all();

  const parsed: UIMessage[] = rows.map((r) => JSON.parse(r.data));
  return Response.json(parsed);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { messages: UIMessage[] };

  // Replace all messages for this thread
  db.delete(messages).where(eq(messages.threadId, id)).run();

  for (const msg of body.messages) {
    db.insert(messages)
      .values({
        id: msg.id,
        threadId: id,
        data: JSON.stringify(msg),
      })
      .run();
  }

  // Touch thread updatedAt
  db.update(threads)
    .set({ updatedAt: new Date() })
    .where(eq(threads.id, id))
    .run();

  return Response.json({ ok: true });
}
