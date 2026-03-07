/**
 * Integration tests for MCP HTTP handler
 * Tests the full HTTP request/response cycle
 */
import { MCPServer } from '../mcp/server';
import { tool } from '../tool';
import { z } from 'zod';

// Create test tools
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

const validatedTool = tool({
  name: 'validated',
  description: 'Tool with strict validation',
  input: z.object({
    email: z.string().email(),
    age: z.number().int().min(0).max(150),
  }),
  output: z.object({ valid: z.boolean() }),
});
validatedTool.server(async () => ({ valid: true }));

function createTestServer() {
  return new MCPServer({
    name: 'test-http',
    version: '1.0.0',
    tools: { echo: echoTool, fail: failTool, validated: validatedTool },
  });
}

function jsonRequest(body: unknown, contentType = 'application/json'): Request {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: JSON.stringify(body),
  });
}

describe('MCP HTTP Handler', () => {
  let server: MCPServer;
  let handler: (req: Request) => Promise<Response>;

  beforeEach(() => {
    server = createTestServer();
    handler = server.httpHandler();
  });

  describe('Content-Type validation', () => {
    it('rejects non-JSON content type', async () => {
      const req = new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: '{}',
      });
      const res = await handler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe(-32700);
    });

    it('accepts application/json with charset', async () => {
      const req = new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
      });
      const res = await handler(req);
      expect(res.status).toBe(200);
    });
  });

  describe('JSON-RPC validation', () => {
    it('rejects invalid JSON', async () => {
      const req = new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      const res = await handler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe(-32700);
    });

    it('rejects wrong JSON-RPC version', async () => {
      const req = jsonRequest({ jsonrpc: '1.0', id: 1, method: 'ping' });
      const res = await handler(req);
      expect(res.status).toBe(400);
    });
  });

  describe('initialize', () => {
    it('returns server info and capabilities', async () => {
      const req = jsonRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' });
      const res = await handler(req);
      const json = await res.json();
      expect(json.result.serverInfo.name).toBe('test-http');
      expect(json.result.serverInfo.version).toBe('1.0.0');
      expect(json.result.capabilities.tools).toBeDefined();
      expect(json.result.protocolVersion).toBe('2024-11-05');
    });
  });

  describe('tools/list', () => {
    it('returns all registered tools', async () => {
      const req = jsonRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
      const res = await handler(req);
      const json = await res.json();
      const tools = json.result.tools;
      expect(tools).toHaveLength(3);
      const names = tools.map((t: { name: string }) => t.name);
      expect(names).toContain('echo');
      expect(names).toContain('fail');
      expect(names).toContain('validated');
    });

    it('includes input schemas', async () => {
      const req = jsonRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
      const res = await handler(req);
      const json = await res.json();
      const echoSchema = json.result.tools.find((t: { name: string }) => t.name === 'echo');
      expect(echoSchema.inputSchema.type).toBe('object');
      expect(echoSchema.inputSchema.properties.message.type).toBe('string');
      expect(echoSchema.inputSchema.required).toContain('message');
    });
  });

  describe('tools/call', () => {
    it('executes a tool and returns result', async () => {
      const req = jsonRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'echo', arguments: { message: 'hello' } },
      });
      const res = await handler(req);
      const json = await res.json();
      expect(json.result.content).toHaveLength(1);
      expect(json.result.content[0].type).toBe('text');
      const parsed = JSON.parse(json.result.content[0].text);
      expect(parsed.echoed).toBe('hello');
    });

    it('returns error for unknown tool', async () => {
      const req = jsonRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'nonexistent', arguments: {} },
      });
      const res = await handler(req);
      const json = await res.json();
      expect(json.error.code).toBe(-32602);
      expect(json.error.message).toContain('Unknown tool');
    });

    it('returns error for missing tool name', async () => {
      const req = jsonRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { arguments: {} },
      });
      const res = await handler(req);
      const json = await res.json();
      expect(json.error.code).toBe(-32602);
    });

    it('handles tool execution failure gracefully', async () => {
      const req = jsonRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'fail', arguments: {} },
      });
      const res = await handler(req);
      const json = await res.json();
      expect(json.result.isError).toBe(true);
      expect(json.result.content[0].text).toContain('Error');
    });

    it('validates input against Zod schema', async () => {
      const req = jsonRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'validated', arguments: { email: 'not-an-email', age: -5 } },
      });
      const res = await handler(req);
      const json = await res.json();
      // Should return validation error
      expect(json.error?.code).toBe(-32602);
    });
  });

  describe('notifications', () => {
    it('returns 204 for notification (no id)', async () => {
      const req = jsonRequest({ jsonrpc: '2.0', method: 'notifications/initialized' });
      const res = await handler(req);
      expect(res.status).toBe(204);
    });
  });

  describe('unknown methods', () => {
    it('returns method not found', async () => {
      const req = jsonRequest({ jsonrpc: '2.0', id: 1, method: 'unknown/method' });
      const res = await handler(req);
      const json = await res.json();
      expect(json.error.code).toBe(-32601);
    });
  });

  describe('security', () => {
    it('prevents prototype chain traversal via tool name', async () => {
      const req = jsonRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'constructor', arguments: {} },
      });
      const res = await handler(req);
      const json = await res.json();
      expect(json.error.code).toBe(-32602);
      expect(json.error.message).toContain('Unknown tool');
    });

    it('prevents __proto__ traversal', async () => {
      const req = jsonRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: '__proto__', arguments: {} },
      });
      const res = await handler(req);
      const json = await res.json();
      expect(json.error.code).toBe(-32602);
    });

    it('prevents toString traversal', async () => {
      const req = jsonRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'toString', arguments: {} },
      });
      const res = await handler(req);
      const json = await res.json();
      expect(json.error.code).toBe(-32602);
    });
  });

  describe('concurrent requests', () => {
    it('handles multiple concurrent tool calls', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        handler(jsonRequest({
          jsonrpc: '2.0',
          id: i + 1,
          method: 'tools/call',
          params: { name: 'echo', arguments: { message: `msg-${i}` } },
        }))
      );
      const responses = await Promise.all(requests);
      for (let i = 0; i < 10; i++) {
        const json = await responses[i].json();
        expect(json.id).toBe(i + 1);
        const parsed = JSON.parse(json.result.content[0].text);
        expect(parsed.echoed).toBe(`msg-${i}`);
      }
    });
  });
});
