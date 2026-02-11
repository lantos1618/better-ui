import { db } from '@/db';
import { threads, messages } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function GET() {
  const allThreads = db
    .select()
    .from(threads)
    .orderBy(desc(threads.updatedAt))
    .all();

  return Response.json(allThreads);
}

export async function POST(req: Request) {
  const body = await req.json() as { title?: string };
  const id = randomUUID();

  db.insert(threads).values({
    id,
    title: body.title || 'New Chat',
  }).run();

  const thread = db.select().from(threads).where(eq(threads.id, id)).get();
  return Response.json(thread, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return Response.json({ error: 'Missing thread id' }, { status: 400 });
  }

  db.delete(threads).where(eq(threads.id, id)).run();
  return Response.json({ ok: true });
}
