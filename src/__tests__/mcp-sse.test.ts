/**
 * Tests for MCP Streamable HTTP (SSE) transport
 */
import { MCPServer } from '../mcp/server';
import { tool } from '../tool';
import { z } from 'zod';

const echoTool = tool({
  name: 'echo',
  description: 'Echo the input',
  input: z.object({ message: z.string() }),
  output: z.object({ echoed: z.string() }),
});
echoTool.server(async ({ message }) => ({ echoed: message }));

function createTestServer() {
  return new MCPServer({
    name: 'test-sse',
    version: '1.0.0',
    tools: { echo: echoTool },
  });
}

function sseRequest(body: unknown): Request {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(body),
  });
}

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

function parseSSEData(sseText: string): unknown[] {
  return sseText
    .split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => JSON.parse(line.slice(6)));
}

describe('MCP Streamable HTTP Handler', () => {
  let server: MCPServer;
  let handler: (req: Request) => Promise<Response>;

  beforeEach(() => {
    server = createTestServer();
    handler = server.streamableHttpHandler();
  });

  describe('SSE mode (Accept: text/event-stream)', () => {
    it('returns SSE content type', async () => {
      const req = sseRequest({ jsonrpc: '2.0', id: 1, method: 'ping' });
      const res = await handler(req);
      expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('returns SSE-formatted response for ping', async () => {
      const req = sseRequest({ jsonrpc: '2.0', id: 1, method: 'ping' });
      const res = await handler(req);
      const text = await readSSE(res);
      const events = parseSSEData(text);
      expect(events).toHaveLength(1);
      expect((events[0] as any).id).toBe(1);
      expect((events[0] as any).result).toEqual({});
    });

    it('streams tool call results', async () => {
      const req = sseRequest({
        jsonrpc: '2.0',
        id: 42,
        method: 'tools/call',
        params: { name: 'echo', arguments: { message: 'via sse' } },
      });
      const res = await handler(req);
      const text = await readSSE(res);
      const events = parseSSEData(text);
      expect(events).toHaveLength(1);
      const event = events[0] as any;
      expect(event.id).toBe(42);
      const parsed = JSON.parse(event.result.content[0].text);
      expect(parsed.echoed).toBe('via sse');
    });

    it('returns SSE error for unknown tool', async () => {
      const req = sseRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'nonexistent', arguments: {} },
      });
      const res = await handler(req);
      const text = await readSSE(res);
      const events = parseSSEData(text);
      expect(events).toHaveLength(1);
      expect((events[0] as any).error).toBeDefined();
    });

    it('includes Cache-Control header', async () => {
      const req = sseRequest({ jsonrpc: '2.0', id: 1, method: 'ping' });
      const res = await handler(req);
      expect(res.headers.get('Cache-Control')).toBe('no-cache');
    });
  });

  describe('JSON mode (no SSE accept header)', () => {
    it('returns JSON response when no SSE accept', async () => {
      const req = jsonRequest({ jsonrpc: '2.0', id: 1, method: 'ping' });
      const res = await handler(req);
      const json = await res.json();
      expect(json.id).toBe(1);
      expect(json.result).toEqual({});
    });

    it('returns 204 for notifications', async () => {
      const req = jsonRequest({ jsonrpc: '2.0', method: 'notifications/initialized' });
      const res = await handler(req);
      expect(res.status).toBe(204);
    });
  });

  describe('error handling', () => {
    it('rejects non-JSON content type', async () => {
      const req = new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Accept': 'text/event-stream',
        },
        body: '{}',
      });
      const res = await handler(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid JSON', async () => {
      const req = new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      const res = await handler(req);
      expect(res.status).toBe(400);
    });
  });
});
