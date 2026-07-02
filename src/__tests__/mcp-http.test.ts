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
      expect(json.result.protocolVersion).toBe('2025-11-25');
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
      // Raw error detail is not leaked when debug is disabled (default).
      expect(json.result.content[0].text).toBe('Tool execution failed');
      expect(json.result.content[0].text).not.toContain('Intentional failure');
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

// ─── New security hardening tests ─────────────────────────────────────────

function requestWithHeaders(body: unknown, headers: Record<string, string>): Request {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const pingMsg = { jsonrpc: '2.0', id: 1, method: 'ping' };

describe('MCP HTTP Handler — Origin validation', () => {
  it('allows requests without an Origin header (non-browser clients)', async () => {
    const handler = createTestServer().httpHandler();
    const res = await handler(jsonRequest(pingMsg));
    expect(res.status).toBe(200);
  });

  it('allows same-origin requests when no allowlist is configured', async () => {
    const handler = createTestServer().httpHandler();
    const res = await handler(requestWithHeaders(pingMsg, {
      Origin: 'http://localhost',
      Host: 'localhost',
    }));
    expect(res.status).toBe(200);
  });

  it('rejects cross-origin requests (403) when no allowlist is configured', async () => {
    const handler = createTestServer().httpHandler();
    const res = await handler(requestWithHeaders(pingMsg, {
      Origin: 'http://evil.example.com',
      Host: 'localhost',
    }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.message).toContain('Origin');
  });

  it('allows an Origin present in the allowlist', async () => {
    const server = new MCPServer({
      name: 'origin-test',
      version: '1.0.0',
      tools: { echo: echoTool },
      allowedOrigins: ['https://app.example.com'],
    });
    const res = await server.httpHandler()(requestWithHeaders(pingMsg, {
      Origin: 'https://app.example.com',
      Host: 'localhost',
    }));
    expect(res.status).toBe(200);
  });

  it('rejects an Origin absent from the allowlist (403)', async () => {
    const server = new MCPServer({
      name: 'origin-test',
      version: '1.0.0',
      tools: { echo: echoTool },
      allowedOrigins: ['https://app.example.com'],
    });
    const res = await server.httpHandler()(requestWithHeaders(pingMsg, {
      Origin: 'https://other.example.com',
      Host: 'localhost',
    }));
    expect(res.status).toBe(403);
  });
});

describe('MCP HTTP Handler — onBeforeExecute auth hook', () => {
  it('blocks tool execution and returns 401 when the hook throws', async () => {
    let executed = false;
    const guardedTool = tool({
      name: 'guarded',
      description: 'Guarded tool',
      input: z.object({ message: z.string() }),
      output: z.object({ echoed: z.string() }),
    });
    guardedTool.server(async ({ message }) => {
      executed = true;
      return { echoed: message };
    });

    const server = new MCPServer({
      name: 'auth-test',
      version: '1.0.0',
      tools: { guarded: guardedTool },
      onBeforeExecute: () => {
        throw new Error('nope');
      },
    });

    const res = await server.httpHandler()(jsonRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'guarded', arguments: { message: 'hi' } },
    }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.message).toBe('Unauthorized');
    expect(executed).toBe(false);
  });

  it('receives tool name, args and request; allows execution when it does not throw', async () => {
    const seen: { name?: string; args?: unknown; hasReq?: boolean } = {};
    const server = new MCPServer({
      name: 'auth-test',
      version: '1.0.0',
      tools: { echo: echoTool },
      onBeforeExecute: (name, args, req) => {
        seen.name = name;
        seen.args = args;
        seen.hasReq = req instanceof Request;
      },
    });

    const res = await server.httpHandler()(jsonRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'echo', arguments: { message: 'hi' } },
    }));

    expect(res.status).toBe(200);
    expect(seen.name).toBe('echo');
    expect(seen.args).toEqual({ message: 'hi' });
    expect(seen.hasReq).toBe(true);
  });

  it('does not invoke the hook for non tools/call methods', async () => {
    let called = false;
    const server = new MCPServer({
      name: 'auth-test',
      version: '1.0.0',
      tools: { echo: echoTool },
      onBeforeExecute: () => { called = true; },
    });
    const res = await server.httpHandler()(jsonRequest(pingMsg));
    expect(res.status).toBe(200);
    expect(called).toBe(false);
  });
});

describe('MCP HTTP Handler — body size limit', () => {
  it('rejects oversized bodies with 413', async () => {
    const server = new MCPServer({
      name: 'limit-test',
      version: '1.0.0',
      tools: { echo: echoTool },
      maxBodyBytes: 100,
    });
    const bigMessage = 'x'.repeat(500);
    const res = await server.httpHandler()(jsonRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'echo', arguments: { message: bigMessage } },
    }));
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error.message).toContain('too large');
  });

  it('accepts bodies within the limit', async () => {
    const server = new MCPServer({
      name: 'limit-test',
      version: '1.0.0',
      tools: { echo: echoTool },
      maxBodyBytes: 1000,
    });
    const res = await server.httpHandler()(jsonRequest(pingMsg));
    expect(res.status).toBe(200);
  });
});

describe('MCP HTTP Handler — non-object body', () => {
  it('rejects a JSON `null` body with a clean 400 (no crash)', async () => {
    const res = await createTestServer().httpHandler()(jsonRequest(null));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe(-32600); // INVALID_REQUEST
  });

  it('rejects a JSON array body with a clean 400', async () => {
    const res = await createTestServer().httpHandler()(jsonRequest([1, 2, 3]));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe(-32600);
  });

  it('rejects a JSON primitive body with a clean 400', async () => {
    const res = await createTestServer().httpHandler()(jsonRequest(42));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe(-32600);
  });
});

describe('MCP HTTP Handler — multibyte body size (no Content-Length)', () => {
  it('rejects a multibyte body over the byte cap on the streamed path (413)', async () => {
    const server = new MCPServer({
      name: 'limit-test',
      version: '1.0.0',
      tools: { echo: echoTool },
      maxBodyBytes: 120,
    });
    // char length < cap but UTF-8 byte length > cap: only a byte-accurate check rejects this.
    const payload = { jsonrpc: '2.0', id: 1, method: 'ping', pad: '€'.repeat(60) };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    expect(JSON.stringify(payload).length).toBeLessThanOrEqual(120);
    expect(bytes.byteLength).toBeGreaterThan(120);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      // @ts-expect-error duplex is required for streamed request bodies (undici)
      duplex: 'half',
    });
    const res = await server.httpHandler()(req);
    expect(res.status).toBe(413);
  });
});

describe('MCP HTTP Handler — error hygiene (debug)', () => {
  it('leaks raw error detail when debug is enabled', async () => {
    const server = new MCPServer({
      name: 'debug-test',
      version: '1.0.0',
      tools: { fail: failTool },
      debug: true,
    });
    const res = await server.httpHandler()(jsonRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'fail', arguments: {} },
    }));
    const json = await res.json();
    expect(json.result.isError).toBe(true);
    expect(json.result.content[0].text).toContain('Intentional failure');
  });
});
