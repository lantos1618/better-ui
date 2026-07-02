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

    it('rejects a JSON `null` body with a clean 400 (no crash)', async () => {
      const res = await handler(makeRequest(null));
      expect(res.status).toBe(400);
    });

    it('rejects a JSON array body with a clean 400', async () => {
      const res = await handler(makeRequest([1, 2, 3]));
      expect(res.status).toBe(400);
    });

    it('rejects a JSON primitive body with a clean 400', async () => {
      const res = await handler(makeRequest('just a string'));
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

  describe('batch tool calls', () => {
    it('executes multiple tool calls in sequence', async () => {
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCalls: [
          { id: 'tc1', name: 'echo', args: { message: 'first' } },
          { id: 'tc2', name: 'echo', args: { message: 'second' } },
        ],
      });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));
      const types = events.map(e => e.type);

      // Should have tool call events for both calls
      const toolStarts = events.filter(e => e.type === 'TOOL_CALL_START');
      expect(toolStarts).toHaveLength(2);
      expect(toolStarts[0].toolCallName).toBe('echo');
      expect(toolStarts[1].toolCallName).toBe('echo');

      const results = events.filter(e => e.type === 'TOOL_CALL_RESULT');
      expect(results).toHaveLength(2);
      expect(JSON.parse(results[0].result as string).echoed).toBe('first');
      expect(JSON.parse(results[1].result as string).echoed).toBe('second');

      // Should have run lifecycle
      expect(types[0]).toBe('RUN_STARTED');
      expect(types[types.length - 1]).toBe('RUN_FINISHED');
    });

    it('stops on first error in batch', async () => {
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCalls: [
          { id: 'tc1', name: 'echo', args: { message: 'ok' } },
          { id: 'tc2', name: 'fail', args: {} },
          { id: 'tc3', name: 'echo', args: { message: 'never' } },
        ],
      });
      const res = await handler(req);
      const events = parseEvents(await readSSE(res));
      const types = events.map(e => e.type);

      expect(types).toContain('RUN_ERROR');
      // Third tool should not execute
      const results = events.filter(e => e.type === 'TOOL_CALL_RESULT');
      expect(results).toHaveLength(1);
    });
  });

  describe('Origin validation', () => {
    function makeRequestWithHeaders(body: unknown, headers: Record<string, string>): Request {
      return new Request('http://localhost/agui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
    }

    it('allows requests without an Origin header', async () => {
      const res = await handler(makeRequest({ threadId: 't1', runId: 'r1' }));
      expect(res.status).toBe(200);
    });

    it('allows same-origin requests when no allowlist configured', async () => {
      const res = await handler(makeRequestWithHeaders(
        { threadId: 't1', runId: 'r1' },
        { Origin: 'http://localhost', Host: 'localhost' },
      ));
      expect(res.status).toBe(200);
    });

    it('rejects cross-origin requests with 403', async () => {
      const res = await handler(makeRequestWithHeaders(
        { threadId: 't1', runId: 'r1' },
        { Origin: 'http://evil.example.com', Host: 'localhost' },
      ));
      expect(res.status).toBe(403);
    });

    it('allows an Origin present in the allowlist', async () => {
      const s = createAGUIServer({
        name: 'origin-test',
        tools: { echo: echoTool },
        allowedOrigins: ['https://app.example.com'],
      });
      const res = await s.handler()(makeRequestWithHeaders(
        { threadId: 't1', runId: 'r1' },
        { Origin: 'https://app.example.com', Host: 'localhost' },
      ));
      expect(res.status).toBe(200);
    });

    it('rejects an Origin absent from the allowlist', async () => {
      const s = createAGUIServer({
        name: 'origin-test',
        tools: { echo: echoTool },
        allowedOrigins: ['https://app.example.com'],
      });
      const res = await s.handler()(makeRequestWithHeaders(
        { threadId: 't1', runId: 'r1' },
        { Origin: 'https://other.example.com', Host: 'localhost' },
      ));
      expect(res.status).toBe(403);
    });
  });

  describe('body size limit', () => {
    it('rejects oversized bodies with 413', async () => {
      const s = createAGUIServer({
        name: 'limit-test',
        tools: { echo: echoTool },
        maxBodyBytes: 100,
      });
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'echo', args: { message: 'x'.repeat(500) } },
      });
      const res = await s.handler()(req);
      expect(res.status).toBe(413);
    });

    it('rejects a multibyte body over the byte cap on the streamed path (413)', async () => {
      const s = createAGUIServer({
        name: 'limit-test',
        tools: { echo: echoTool },
        maxBodyBytes: 120,
      });
      // char length < cap but UTF-8 byte length > cap: only a byte-accurate check rejects this.
      const payload = { threadId: 't1', runId: 'r1', pad: '€'.repeat(60) };
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      expect(JSON.stringify(payload).length).toBeLessThanOrEqual(120);
      expect(bytes.byteLength).toBeGreaterThan(120);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });
      const req = new Request('http://localhost/agui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: stream,
        // @ts-expect-error duplex is required for streamed request bodies (undici)
        duplex: 'half',
      });
      const res = await s.handler()(req);
      expect(res.status).toBe(413);
    });
  });

  describe('onBeforeExecute auth hook', () => {
    it('blocks execution and emits RUN_ERROR when the hook throws', async () => {
      let executed = false;
      const guardedTool = tool({
        name: 'guarded',
        description: 'Guarded',
        input: z.object({ message: z.string() }),
        output: z.object({ echoed: z.string() }),
      });
      guardedTool.server(async ({ message }) => {
        executed = true;
        return { echoed: message };
      });

      const s = createAGUIServer({
        name: 'auth-test',
        tools: { guarded: guardedTool },
        onBeforeExecute: () => { throw new Error('Unauthorized'); },
      });

      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'guarded', args: { message: 'hi' } },
      });
      const events = parseEvents(await readSSE(await s.handler()(req)));
      const types = events.map(e => e.type);

      expect(types).toContain('RUN_ERROR');
      expect(types).not.toContain('TOOL_CALL_RESULT');
      expect(executed).toBe(false);
      const error = events.find(e => e.type === 'RUN_ERROR');
      expect(error!.message).toBe('Unauthorized');
    });

    it('receives tool name, args and request and allows execution when it does not throw', async () => {
      const seen: { name?: string; args?: unknown; hasReq?: boolean } = {};
      const s = createAGUIServer({
        name: 'auth-test',
        tools: { echo: echoTool },
        onBeforeExecute: (name, args, req) => {
          seen.name = name;
          seen.args = args;
          seen.hasReq = req instanceof Request;
        },
      });
      const req = makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'echo', args: { message: 'hi' } },
      });
      const events = parseEvents(await readSSE(await s.handler()(req)));
      expect(events.map(e => e.type)).toContain('TOOL_CALL_RESULT');
      expect(seen.name).toBe('echo');
      expect(seen.args).toEqual({ message: 'hi' });
      expect(seen.hasReq).toBe(true);
    });
  });

  describe('error hygiene (debug)', () => {
    it('genericizes tool execution errors by default', async () => {
      const events = parseEvents(await readSSE(await handler(makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'fail', args: {} },
      }))));
      const error = events.find(e => e.type === 'RUN_ERROR');
      expect(error!.message).toBe('Tool execution failed');
      expect(error!.message).not.toContain('Intentional failure');
    });

    it('exposes raw error detail when debug is enabled', async () => {
      const s = createAGUIServer({
        name: 'debug-test',
        tools: { fail: failTool },
        debug: true,
      });
      const events = parseEvents(await readSSE(await s.handler()(makeRequest({
        threadId: 't1',
        runId: 'r1',
        toolCall: { id: 'tc1', name: 'fail', args: {} },
      }))));
      const error = events.find(e => e.type === 'RUN_ERROR');
      expect((error!.message as string)).toContain('Intentional failure');
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
