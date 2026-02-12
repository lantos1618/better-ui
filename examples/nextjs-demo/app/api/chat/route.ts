import { openai } from '@ai-sdk/openai';
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { weatherTool, searchTool, counterTool, artifactTool, navigateTool, setThemeTool, stockQuoteTool, sendEmailTool, taskListTool, questionTool, formTool, dataTableTool, progressTool, mediaTool, codeTool, fileUploadTool } from '@/lib/tools';
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

  // Parse JSON envelopes from user messages to extract stateContext.
  // Envelope format: { text, stateContext, _meta: { hidden } }
  // Plain text messages pass through unchanged.
  let aggregatedStateContext: Record<string, unknown> = {};
  const cleanedMessages = messages.map((msg: any) => {
    if (msg.role !== 'user') return msg;

    // UIMessages have parts array — check text parts for envelopes
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
          // Not an envelope — plain text
        }
        return part;
      });
      return { ...msg, parts: newParts };
    }

    // Fallback: content string (shouldn't happen with AI SDK v5 but be safe)
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

  // Build state context addendum for the system prompt
  const stateContextBlock = Object.keys(aggregatedStateContext).length > 0
    ? `\n\nCurrent UI tool state (updated by user interactions):\n${JSON.stringify(aggregatedStateContext, null, 2)}`
    : '';

  // AI SDK v5: Convert UIMessage[] from client to ModelMessage[] for streamText
  const modelMessages = convertToModelMessages(cleanedMessages);

  const result = await streamText({
    model: openai('gpt-5.2'),
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
      // Use Better UI's toAITool() - that's it!
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

  return result.toUIMessageStreamResponse();
}
