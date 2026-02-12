import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { openai } from '@ai-sdk/openai';
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { Readable } from 'node:stream';
import {
  weatherTool, searchTool, counterTool, artifactTool, navigateTool,
  setThemeTool, stockQuoteTool, sendEmailTool, taskListTool, questionTool,
  formTool, dataTableTool, progressTool, mediaTool, codeTool, fileUploadTool,
  tools as toolMap,
} from './lib/tools.tsx';

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
- question tool: just call it — do NOT write "Let me ask you..." or repeat the question in text
- form tool: just call it — do NOT describe the form fields in text
- dataTable tool: just call it — do NOT list the data in text
- weather/stockQuote: just call it — do NOT say "Let me check..."
Only add text when it provides information beyond what the tool UI shows (e.g. summarizing results, explaining next steps after the user answers).

When calling tools, always fill in ALL fields with sensible content. Never leave required fields empty — e.g. when sending an email, write a proper subject and body even if the user didn't specify them.

When the user asks for something that involves multiple steps (e.g. "get weather for 3 cities and send an email summary"), create a task list first with the taskList tool, then work through each task — updating status to 'running' before starting and 'done' (with a brief result summary) after completing each one. Always complete all tasks before stopping.${stateContextBlock}`,
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Express server listening on http://localhost:${PORT}`);
});
