/**
 * Tests for AG-UI protocol server
 */
import { AGUIServer, createAGUIServer } from '../agui/server';
import { tool } from '../tool';
import { z } from 'zod';

// Test tools
const echoTool = tool({
  name: 'echo',
  description: 'Echo the input',
  input: z.object({ message: z.string() }),
  output: z.object({ echoed: z.string() }),
});
echoTool.server(async ({ message }) => ({ echoed: message }));

const failTool = tool({
  name: 'fail',
  description: 'Always fails',
  input: z.object({}),
  output: z.object({}),
});
failTool.server(async () => { throw new Error('Intentional failure'); });

function createTestServer() {
  return createAGUIServer({
    name: 'test-agui',
    tools: { echo: echoTool, fail: failTool },
  });
}

async function readSSE(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

function parseEvents(sseText: string): Array<Record<string, unknown>> {
  return sseText
    .split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => JSON.parse(line.slice(6)));
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/agui', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('AG-UI Server', () => {
  let server: AGUIServer;
  let handler: (req: Request) => Promise<Response>;

  beforeEach(() => {
    server = createTestServer();
    handler = server.handler();
  });

  describe('createAGUIServer', () => {
    it('creates a server instance', () => {
      expect(server).toBeInstanceOf(AGUIServer);
    });
  });

  describe('listTools', () => {
    it('returns all tools with metadata', () => {
      const tools = server.listTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('echo');
      expect(tools[0].description).toBe('Echo the input');
      expect(tools[0].parameters).toBeDefined();
      expect(tools[0].parameters.type).toBe('object');
    });
  });

  describe('handler', () => {
    it('returns SSE content type', async () => {
      const req = makeRequest({ threadId: 't1', runId: 'r1' });
      const res = await handler(req);
      expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('rejects invalid JSON', async () => {
      const req = new Request('http://localhost/agui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      const res = await handler(req);
      expect(res.status).toBe(400);
    });

    it('rejects missing threadId', async () => {
      const req = makeRequest({ runId: 'r1' });
      const res = await handler(req);
      expect(res.status).toBe(400);
    });

    it('rejects missing runId', async () => {
      const req = makeRequest({ threadId: 't1' });
      const res = await handler(req);
      expect(res.status).toBe(400);
    });
  });

  describe('lifecycle events', () => {
    it('emits RUN_STARTED and RUN_FINISHED', async () => {
      const req = makeRequest({ threadId: 't1', runId: 'r1' });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));

      expect(events[0].type).toBe('RUN_STARTED');
      expect(events[0].threadId).toBe('t1');
      expect(events[0].runId).toBe('r1');

      const last = events[events.length - 1];
      expect(last.type).toBe('RUN_FINISHED');
      expect(last.threadId).toBe('t1');
      expect(last.runId).toBe('r1');
    });

    it('includes timestamps on all events', async () => {
      const req = makeRequest({ threadId: 't1', runId: 'r1' });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));

      for (const event of events) {
        expect(event.timestamp).toBeDefined();
        expect(typeof event.timestamp).toBe('number');
      }
    });
  });

  describe('tool execution', () => {
    it('emits tool call lifecycle events', async () => {
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'echo', args: { message: 'hello' } },
      });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));
      const types = events.map(e => e.type);

      expect(types).toContain('RUN_STARTED');
      expect(types).toContain('TOOL_CALL_START');
      expect(types).toContain('TOOL_CALL_ARGS');
      expect(types).toContain('TOOL_CALL_RESULT');
      expect(types).toContain('TOOL_CALL_END');
      expect(types).toContain('RUN_FINISHED');
    });

    it('includes correct tool call data', async () => {
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'echo', args: { message: 'world' } },
      });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));

      const start = events.find(e => e.type === 'TOOL_CALL_START');
      expect(start!.toolCallId).toBe('tc1');
      expect(start!.toolCallName).toBe('echo');

      const args = events.find(e => e.type === 'TOOL_CALL_ARGS');
      expect(JSON.parse(args!.delta as string)).toEqual({ message: 'world' });

      const result = events.find(e => e.type === 'TOOL_CALL_RESULT');
      expect(JSON.parse(result!.result as string)).toEqual({ echoed: 'world' });

      const end = events.find(e => e.type === 'TOOL_CALL_END');
      expect(end!.toolCallId).toBe('tc1');
    });

    it('emits RUN_ERROR for unknown tool', async () => {
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'nonexistent', args: {} },
      });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));
      const types = events.map(e => e.type);

      expect(types).toContain('RUN_ERROR');
      const error = events.find(e => e.type === 'RUN_ERROR');
      expect((error!.message as string)).toContain('Unknown tool');
    });

    it('emits RUN_ERROR for tool execution failure', async () => {
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'fail', args: {} },
      });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));
      const types = events.map(e => e.type);

      expect(types).toContain('RUN_ERROR');
    });
  });

  describe('text message (no tool call)', () => {
    it('lists available tools as a text message', async () => {
      const req = makeRequest({ threadId: 't1', runId: 'r1' });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));
      const types = events.map(e => e.type);

      expect(types).toContain('TEXT_MESSAGE_START');
      expect(types).toContain('TEXT_MESSAGE_CONTENT');
      expect(types).toContain('TEXT_MESSAGE_END');

      const content = events.find(e => e.type === 'TEXT_MESSAGE_CONTENT');
      expect((content!.delta as string)).toContain('echo');
      expect((content!.delta as string)).toContain('fail');
    });
  });

  describe('security', () => {
    it('prevents prototype chain traversal on tool lookup', async () => {
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'constructor', args: {} },
      });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));
      const error = events.find(e => e.type === 'RUN_ERROR');
      expect(error).toBeDefined();
      expect((error!.message as string)).toContain('Unknown tool');
    });

    it('prevents __proto__ traversal', async () => {
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: '__proto__', args: {} },
      });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));
      const error = events.find(e => e.type === 'RUN_ERROR');
      expect(error).toBeDefined();
    });
  });

  describe('context passthrough', () => {
    it('passes context to tool execution', async () => {
      let receivedCtx: any = null;
      const ctxTool = tool({
        name: 'ctxTool',
        description: 'Test context',
        input: z.object({}),
        output: z.object({ hasCtx: z.boolean() }),
      });
      ctxTool.server(async (_input, ctx) => {
        receivedCtx = ctx;
        return { hasCtx: true };
      });

      const server = createAGUIServer({
        name: 'ctx-test',
        tools: { ctxTool },
        context: { env: { TEST: 'value' } } as any,
      });

      const handler = server.handler();
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'ctxTool', args: {} },
      });

      await readSSE(await handler(req));

      expect(receivedCtx).toBeDefined();
      expect(receivedCtx.isServer).toBe(true);
      expect(receivedCtx.env.TEST).toBe('value');
    });
  });
});
