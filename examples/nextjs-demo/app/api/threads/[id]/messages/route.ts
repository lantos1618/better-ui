import { db } from '@/db';
import { threads, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { UIMessage } from 'ai';

// ⚠️ DEMO ONLY: This route has NO authentication or ownership checks. Any caller
// can read or overwrite any thread's messages by guessing its id (IDOR). Add a
// session/auth layer that scopes threads to the authenticated user before
// deploying anything like this to production.

// Guardrails to keep the demo from being trivially abused.
const MAX_BODY_BYTES = 1_000_000; // ~1MB
const MAX_MESSAGES = 500;

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

  // Enforce a body-size cap before parsing to avoid unbounded memory use.
  const raw = await req.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return Response.json({ error: 'Payload too large' }, { status: 413 });
  }

  let body: { messages?: UIMessage[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const msgs = body?.messages;
  if (!Array.isArray(msgs)) {
    return Response.json({ error: 'messages must be an array' }, { status: 400 });
  }
  if (msgs.length > MAX_MESSAGES) {
    return Response.json(
      { error: `Too many messages (max ${MAX_MESSAGES})` },
      { status: 400 }
    );
  }

  // Thread must exist before we replace its messages.
  const thread = db.select().from(threads).where(eq(threads.id, id)).get();
  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 });
  }

  // Replace all messages for this thread
  db.delete(messages).where(eq(messages.threadId, id)).run();

  for (const msg of msgs) {
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
