import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import express from 'express';
import cors from 'cors';
import { openai } from '@ai-sdk/openai';
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import {
  weatherTool, searchTool, counterTool, artifactTool, navigateTool,
  setThemeTool, stockQuoteTool, sendEmailTool, taskListTool, questionTool,
  formTool, dataTableTool, progressTool, mediaTool, codeTool, fileUploadTool,
  tools as toolMap,
  setSearchProvider, createExaProvider,
} from './lib/tools.tsx';

// Wire up search provider — set EXA_API_KEY in .env.local to enable real search
const exaKey = process.env.EXA_API_KEY;
if (exaKey) setSearchProvider(createExaProvider(exaKey));
import { db } from './db/index.js';
import { threads, messages } from './db/schema.js';
import { eq, desc } from 'drizzle-orm';

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// POST /api/chat — AI SDK v5 streaming
// ---------------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  // Parse JSON envelopes from user messages to extract stateContext.
  let aggregatedStateContext: Record<string, unknown> = {};
  const cleanedMessages = messages.map((msg: any) => {
    if (msg.role !== 'user') return msg;

    if (msg.parts && Array.isArray(msg.parts)) {
      const newParts = msg.parts.map((part: any) => {
        if (part.type !== 'text' || !part.text) return part;
        try {
          const envelope = JSON.parse(part.text);
          if (envelope && typeof envelope === 'object' && '_meta' in envelope) {
            if (envelope.stateContext) {
              Object.assign(aggregatedStateContext, envelope.stateContext);
            }
            return { ...part, text: envelope.text || '' };
          }
        } catch {
          // Not an envelope
        }
        return part;
      });
      return { ...msg, parts: newParts };
    }

    if (typeof msg.content === 'string') {
      try {
        const envelope = JSON.parse(msg.content);
        if (envelope && typeof envelope === 'object' && '_meta' in envelope) {
          if (envelope.stateContext) {
            Object.assign(aggregatedStateContext, envelope.stateContext);
          }
          return { ...msg, content: envelope.text || '' };
        }
      } catch {
        // Not an envelope
      }
    }

    return msg;
  });

  const stateContextBlock = Object.keys(aggregatedStateContext).length > 0
    ? `\n\nCurrent UI tool state (updated by user interactions):\n${JSON.stringify(aggregatedStateContext, null, 2)}`
    : '';

  const modelMessages = convertToModelMessages(cleanedMessages);

  const result = await streamText({
    model: openai('gpt-4o'),
    system: `You are a helpful assistant with access to tools. When the user asks you to perform an action that matches a tool, always call the tool directly — never ask for textual confirmation. Tools that need user approval have a built-in confirmation UI; just invoke them and the user will be prompted automatically.

IMPORTANT: Every tool renders its own UI. When you call a tool, do NOT repeat or narrate what the tool already shows. For example:
- search tool: just call it — do NOT list the results in text, the UI already shows them
- question tool: just call it — do NOT write "Let me ask you..." or repeat the question in text
- form tool: just call it — do NOT describe the form fields in text
- dataTable tool: just call it — do NOT list the data in text
- weather/stockQuote: just call it — do NOT say "Let me check..."
Only add text when it provides information beyond what the tool UI shows (e.g. summarizing results, explaining next steps after the user answers).
When a tool result is self-explanatory, you can respond with JUST the tool call and no text at all.

When calling tools, always fill in ALL fields with sensible content. Never leave required fields empty — e.g. when sending an email, write a proper subject and body even if the user didn't specify them.

When the user asks for something that involves multiple steps (e.g. "get weather for 3 cities and send an email summary"), create a task list first with the taskList tool, then work through every task:
1. Mark the current task as 'running' (taskList update)
2. Execute it by calling the appropriate tool
3. Mark it as 'done' with a brief result summary (taskList update)
4. Immediately proceed to the next pending task — do NOT stop, summarize, or ask the user
5. Repeat until progress.done === progress.total — every task must be completed in a single response${stateContextBlock}`,
    messages: modelMessages,
    tools: {
      weather: weatherTool.toAITool(),
      search: searchTool.toAITool(),
      counter: counterTool.toAITool(),
      artifact: artifactTool.toAITool(),
      navigate: navigateTool.toAITool(),
      setTheme: setThemeTool.toAITool(),
      stockQuote: stockQuoteTool.toAITool(),
      sendEmail: sendEmailTool.toAITool(),
      taskList: taskListTool.toAITool(),
      question: questionTool.toAITool(),
      form: formTool.toAITool(),
      dataTable: dataTableTool.toAITool(),
      progress: progressTool.toAITool(),
      media: mediaTool.toAITool(),
      code: codeTool.toAITool(),
      fileUpload: fileUploadTool.toAITool(),
    },
    stopWhen: stepCountIs(10),
  });

  const webResponse = result.toUIMessageStreamResponse();

  // Pipe the Web Response body into Express res
  res.status(webResponse.status);
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (webResponse.body) {
    const nodeStream = Readable.fromWeb(webResponse.body as any);
    nodeStream.pipe(res);
  } else {
    res.end();
  }
});

// ---------------------------------------------------------------------------
// POST /api/tools/execute — Direct tool execution (non-HITL)
// ---------------------------------------------------------------------------
app.post('/api/tools/execute', async (req, res) => {
  try {
    const { tool: toolName, input } = req.body;

    if (!toolName) return res.status(400).json({ error: 'Missing tool name' });
    if (input === undefined) return res.status(400).json({ error: 'Missing input' });

    const tool = toolMap[toolName as keyof typeof toolMap];
    if (!tool) return res.status(404).json({ error: 'Tool not found' });

    if (tool.requiresConfirmation && tool.shouldConfirm(input)) {
      return res.status(403).json({ error: 'This tool requires confirmation. Use /api/tools/confirm.' });
    }

    const result = await tool.run(input, { isServer: true });
    res.json({ result });
  } catch (error) {
    console.error('Tool execution error:', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Tool execution failed',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/tools/confirm — HITL tool execution
// ---------------------------------------------------------------------------
app.post('/api/tools/confirm', async (req, res) => {
  try {
    const { tool: toolName, input } = req.body;

    if (!toolName) return res.status(400).json({ error: 'Missing tool name' });
    if (input === undefined) return res.status(400).json({ error: 'Missing input' });

    const tool = toolMap[toolName as keyof typeof toolMap];
    if (!tool) return res.status(404).json({ error: 'Tool not found' });

    if (!tool.requiresConfirmation) {
      return res.status(400).json({ error: 'This tool does not require confirmation. Use /api/tools/execute.' });
    }

    const result = await tool.run(input, { isServer: true });
    res.json({ result });
  } catch (error) {
    console.error('Tool confirmation error:', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Tool execution failed',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/threads — List all threads
// ---------------------------------------------------------------------------
app.get('/api/threads', (_req, res) => {
  const allThreads = db
    .select()
    .from(threads)
    .orderBy(desc(threads.updatedAt))
    .all();

  res.json(allThreads);
});

// ---------------------------------------------------------------------------
// POST /api/threads — Create a new thread
// ---------------------------------------------------------------------------
app.post('/api/threads', async (req, res) => {
  const { title } = req.body as { title?: string };
  const id = randomUUID();

  db.insert(threads)
    .values({ id, title: title || 'New Chat' })
    .run();

  const thread = db.select().from(threads).where(eq(threads.id, id)).get();
  res.status(201).json(thread);
});

// ---------------------------------------------------------------------------
// DELETE /api/threads — Delete a thread by ?id=
// ---------------------------------------------------------------------------
app.delete('/api/threads', (req, res) => {
  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: 'Missing thread id' });
    return;
  }

  db.delete(threads).where(eq(threads.id, id)).run();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/threads/:id/messages — Get messages for a thread
// ---------------------------------------------------------------------------
app.get('/api/threads/:id/messages', (req, res) => {
  const { id } = req.params;

  const rows = db
    .select()
    .from(messages)
    .where(eq(messages.threadId, id))
    .all();

  const parsed = rows.map((r) => JSON.parse(r.data));
  res.json(parsed);
});

// ---------------------------------------------------------------------------
// POST /api/threads/:id/messages — Save messages for a thread (replaces all)
// ---------------------------------------------------------------------------
app.post('/api/threads/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { messages: msgs } = req.body as { messages: any[] };

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

  res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Express server listening on http://localhost:${PORT}`);
});
