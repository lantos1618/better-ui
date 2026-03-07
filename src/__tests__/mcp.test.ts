/**
 * Tests for MCP Server
 */

import { z } from 'zod';
import { tool } from '../tool';
import { MCPServer, createMCPServer } from '../mcp/server';
import { zodToJsonSchema } from '../mcp/schema';

// ─── Zod to JSON Schema tests ─────────────────────────────────────────────

describe('zodToJsonSchema', () => {
  it('converts string schema', () => {
    expect(zodToJsonSchema(z.string())).toEqual({ type: 'string' });
  });

  it('converts string with constraints', () => {
    const schema = z.string().min(1).max(100).email();
    const json = zodToJsonSchema(schema);
    expect(json.type).toBe('string');
    expect(json.minLength).toBe(1);
    expect(json.maxLength).toBe(100);
    expect(json.format).toBe('email');
  });

  it('converts number schema', () => {
    expect(zodToJsonSchema(z.number())).toEqual({ type: 'number' });
  });

  it('converts integer', () => {
    const schema = z.number().int().min(0).max(100);
    const json = zodToJsonSchema(schema);
    expect(json.type).toBe('integer');
    expect(json.minimum).toBe(0);
    expect(json.maximum).toBe(100);
  });

  it('converts boolean', () => {
    expect(zodToJsonSchema(z.boolean())).toEqual({ type: 'boolean' });
  });

  it('converts object', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const json = zodToJsonSchema(schema);
    expect(json.type).toBe('object');
    expect(json.properties).toEqual({
      name: { type: 'string' },
      age: { type: 'number' },
    });
    expect(json.required).toEqual(['name', 'age']);
  });

  it('handles optional fields', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });
    const json = zodToJsonSchema(schema);
    expect(json.required).toEqual(['required']);
  });

  it('handles defaults', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number().default(0),
    });
    const json = zodToJsonSchema(schema);
    expect(json.required).toEqual(['name']);
    expect(json.properties!.count.default).toBe(0);
  });

  it('converts array', () => {
    const schema = z.array(z.string());
    const json = zodToJsonSchema(schema);
    expect(json.type).toBe('array');
    expect(json.items).toEqual({ type: 'string' });
  });

  it('converts enum', () => {
    const schema = z.enum(['a', 'b', 'c']);
    const json = zodToJsonSchema(schema);
    expect(json.type).toBe('string');
    expect(json.enum).toEqual(['a', 'b', 'c']);
  });

  it('converts nullable', () => {
    const schema = z.string().nullable();
    const json = zodToJsonSchema(schema);
    expect(json.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
  });

  it('converts union', () => {
    const schema = z.union([z.string(), z.number()]);
    const json = zodToJsonSchema(schema);
    expect(json.anyOf).toEqual([{ type: 'string' }, { type: 'number' }]);
  });

  it('converts nested objects', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        address: z.object({
          city: z.string(),
        }),
      }),
    });
    const json = zodToJsonSchema(schema);
    expect(json.properties!.user.type).toBe('object');
    expect((json.properties!.user.properties as any).address.type).toBe('object');
  });

  it('converts literal', () => {
    expect(zodToJsonSchema(z.literal('hello'))).toEqual({ enum: ['hello'] });
    expect(zodToJsonSchema(z.literal(42))).toEqual({ enum: [42] });
  });

  it('handles z.any()', () => {
    expect(zodToJsonSchema(z.any())).toEqual({});
  });

  it('handles z.record()', () => {
    const schema = z.record(z.number());
    const json = zodToJsonSchema(schema);
    expect(json.type).toBe('object');
    expect(json.additionalProperties).toEqual({ type: 'number' });
  });

  it('handles effects (refine/transform)', () => {
    const schema = z.string().refine((s) => s.length > 0);
    const json = zodToJsonSchema(schema);
    expect(json.type).toBe('string');
  });
});

// ─── MCPServer tests ───────────────────────────────────────────────────────

describe('MCPServer', () => {
  let weatherTool: any;
  let calcTool: any;
  let server: MCPServer;

  beforeEach(() => {
    weatherTool = tool({
      name: 'weather',
      description: 'Get weather for a city',
      input: z.object({ city: z.string() }),
      output: z.object({ temp: z.number(), city: z.string() }),
    });
    weatherTool.server(async ({ city }: { city: string }) => ({
      temp: 72,
      city,
    }));

    calcTool = tool({
      name: 'calc',
      description: 'Add two numbers',
      input: z.object({ a: z.number(), b: z.number() }),
      output: z.object({ result: z.number() }),
    });
    calcTool.server(({ a, b }: { a: number; b: number }) => ({ result: a + b }));

    server = createMCPServer({
      name: 'test-server',
      version: '0.1.0',
      tools: { weather: weatherTool, calc: calcTool },
    });
  });

  describe('initialize', () => {
    it('responds to initialize with server info', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      });

      expect(response).not.toBeNull();
      expect(response!.id).toBe(1);
      expect(response!.result).toEqual({
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'test-server', version: '0.1.0' },
      });
    });
  });

  describe('notifications', () => {
    it('returns null for notifications (no id)', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      } as any);

      expect(response).toBeNull();
    });
  });

  describe('tools/list', () => {
    it('lists all registered tools', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });

      expect(response!.result).toEqual({
        tools: [
          {
            name: 'weather',
            description: 'Get weather for a city',
            inputSchema: {
              type: 'object',
              properties: { city: { type: 'string' } },
              required: ['city'],
            },
          },
          {
            name: 'calc',
            description: 'Add two numbers',
            inputSchema: {
              type: 'object',
              properties: {
                a: { type: 'number' },
                b: { type: 'number' },
              },
              required: ['a', 'b'],
            },
          },
        ],
      });
    });

    it('uses tool name as description fallback', async () => {
      const noDescTool = tool({
        name: 'nodesc',
        input: z.object({ x: z.number() }),
      });
      noDescTool.server(({ x }) => ({ y: x }));

      const s = createMCPServer({
        name: 'test',
        version: '1.0.0',
        tools: { nodesc: noDescTool },
      });

      const tools = s.listTools();
      expect(tools[0].description).toBe('nodesc');
    });
  });

  describe('tools/call', () => {
    it('calls a tool and returns result', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'weather',
          arguments: { city: 'London' },
        },
      });

      expect(response!.error).toBeUndefined();
      const result = response!.result as any;
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({ temp: 72, city: 'London' });
    });

    it('calls calc tool correctly', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'calc',
          arguments: { a: 3, b: 7 },
        },
      });

      const result = response!.result as any;
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({ result: 10 });
    });

    it('returns error for unknown tool', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'nonexistent',
          arguments: {},
        },
      });

      expect(response!.error).toBeDefined();
      expect(response!.error!.code).toBe(-32602);
      expect(response!.error!.message).toContain('Unknown tool');
    });

    it('returns error for invalid input', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'weather',
          arguments: { city: 123 },
        },
      });

      expect(response!.error).toBeDefined();
      expect(response!.error!.code).toBe(-32602);
    });

    it('returns error when tool name is missing', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { arguments: {} },
      });

      expect(response!.error).toBeDefined();
      expect(response!.error!.message).toBe('Missing tool name');
    });

    it('defaults arguments to empty object', async () => {
      const emptyTool = tool({
        name: 'empty',
        input: z.object({}),
      });
      emptyTool.server(() => ({ ok: true }));

      const s = createMCPServer({
        name: 'test',
        version: '1.0.0',
        tools: { empty: emptyTool },
      });

      const response = await s.handleMessage({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: { name: 'empty' },
      });

      expect(response!.error).toBeUndefined();
      const result = response!.result as any;
      expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('handles server handler errors gracefully', async () => {
      const errorTool = tool({
        name: 'error',
        input: z.object({ x: z.number() }),
      });
      errorTool.server(() => {
        throw new Error('Something broke');
      });

      const s = createMCPServer({
        name: 'test',
        version: '1.0.0',
        tools: { error: errorTool },
      });

      const response = await s.handleMessage({
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: { name: 'error', arguments: { x: 1 } },
      });

      // MCP convention: tool errors are returned as content with isError flag
      const result = response!.result as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Something broke');
    });
  });

  describe('unknown methods', () => {
    it('returns METHOD_NOT_FOUND for unknown methods', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 10,
        method: 'resources/list',
      });

      expect(response!.error).toBeDefined();
      expect(response!.error!.code).toBe(-32601);
    });
  });

  describe('ping', () => {
    it('responds to ping', async () => {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 11,
        method: 'ping',
      });

      expect(response!.result).toEqual({});
    });
  });

  describe('callTool public API', () => {
    it('exposes callTool for programmatic use', async () => {
      const result = await server.callTool('weather', { city: 'Tokyo' });
      expect(result.content).toHaveLength(1);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.city).toBe('Tokyo');
    });

    it('throws McpError for unknown tool', async () => {
      await expect(server.callTool('nope', {})).rejects.toThrow('Unknown tool: nope');
    });
  });

  describe('listTools public API', () => {
    it('returns tool schemas', () => {
      const tools = server.listTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('weather');
      expect(tools[1].name).toBe('calc');
    });
  });

  describe('context passthrough', () => {
    it('passes configured context to tools', async () => {
      let receivedCtx: any = null;

      const ctxTool = tool({
        name: 'ctxtest',
        input: z.object({ x: z.number() }),
      });
      ctxTool.server((input, ctx) => {
        receivedCtx = ctx;
        return { x: input.x };
      });

      const s = createMCPServer({
        name: 'test',
        version: '1.0.0',
        tools: { ctxtest: ctxTool },
        context: {
          env: { MY_SECRET: 'secret123' },
        },
      });

      await s.callTool('ctxtest', { x: 42 });

      expect(receivedCtx.isServer).toBe(true);
      expect(receivedCtx.env).toEqual({ MY_SECRET: 'secret123' });
    });
  });

  describe('security', () => {
    it('validates input via Zod before execution', async () => {
      let serverCalled = false;
      const strictTool = tool({
        name: 'strict',
        input: z.object({ name: z.string().min(1).max(50) }),
      });
      strictTool.server(() => {
        serverCalled = true;
        return { ok: true };
      });

      const s = createMCPServer({
        name: 'test',
        version: '1.0.0',
        tools: { strict: strictTool },
      });

      // Empty string should fail min(1)
      const response = await s.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'strict', arguments: { name: '' } },
      });

      expect(response!.error).toBeDefined();
      expect(serverCalled).toBe(false);
    });

    it('does not expose tool internals in list', () => {
      const tools = server.listTools();
      for (const t of tools) {
        const json = JSON.stringify(t);
        expect(json).not.toContain('handler');
        expect(json).not.toContain('_server');
        expect(json).not.toContain('_client');
      }
    });

    it('strips extra properties from input via Zod', async () => {
      let receivedInput: any = null;
      const safeTool = tool({
        name: 'safe',
        input: z.object({ name: z.string() }),
      });
      safeTool.server((input) => {
        receivedInput = input;
        return input;
      });

      const s = createMCPServer({
        name: 'test',
        version: '1.0.0',
        tools: { safe: safeTool },
      });

      await s.callTool('safe', { name: 'test', isAdmin: true, __proto__: { evil: true } });

      expect(receivedInput).toEqual({ name: 'test' });
      expect(receivedInput.isAdmin).toBeUndefined();
    });

    it('always runs with isServer: true', async () => {
      let wasServer = false;
      const t = tool({
        name: 'servercheck',
        input: z.object({}),
      });
      t.server((_, ctx) => {
        wasServer = ctx.isServer;
        return {};
      });

      const s = createMCPServer({
        name: 'test',
        version: '1.0.0',
        tools: { servercheck: t },
      });

      await s.callTool('servercheck', {});
      expect(wasServer).toBe(true);
    });
  });
});

describe('createMCPServer', () => {
  it('returns an MCPServer instance', () => {
    const server = createMCPServer({
      name: 'test',
      version: '1.0.0',
      tools: {},
    });
    expect(server).toBeInstanceOf(MCPServer);
  });
});

describe('MCPServer.httpHandler', () => {
  let server: MCPServer;

  beforeEach(() => {
    const t = tool({
      name: 'echo',
      description: 'Echo input',
      input: z.object({ msg: z.string() }),
    });
    t.server(({ msg }) => ({ echo: msg }));

    server = createMCPServer({
      name: 'http-test',
      version: '1.0.0',
      tools: { echo: t },
    });
  });

  function makeRequest(body: unknown, contentType = 'application/json'): Request {
    return new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: JSON.stringify(body),
    });
  }

  it('handles initialize over HTTP', async () => {
    const handler = server.httpHandler();
    const res = await handler(makeRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {},
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result.serverInfo.name).toBe('http-test');
  });

  it('handles tools/call over HTTP', async () => {
    const handler = server.httpHandler();
    const res = await handler(makeRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'echo', arguments: { msg: 'hello' } },
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    const parsed = JSON.parse(data.result.content[0].text);
    expect(parsed).toEqual({ echo: 'hello' });
  });

  it('returns 204 for notifications', async () => {
    const handler = server.httpHandler();
    const res = await handler(makeRequest({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }));

    expect(res.status).toBe(204);
  });

  it('rejects non-JSON Content-Type', async () => {
    const handler = server.httpHandler();
    const res = await handler(makeRequest({}, 'text/plain'));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe(-32700);
  });

  it('rejects invalid JSON body', async () => {
    const handler = server.httpHandler();
    const res = await handler(new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe(-32700);
  });

  it('rejects invalid JSON-RPC version', async () => {
    const handler = server.httpHandler();
    const res = await handler(makeRequest({
      jsonrpc: '1.0',
      id: 1,
      method: 'ping',
    }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe(-32600);
  });
});

describe('MCPServer prototype pollution protection', () => {
  it('rejects __proto__ in tool arguments via Zod stripping', async () => {
    const t = tool({
      name: 'safe',
      input: z.object({ name: z.string() }),
    });
    let receivedInput: any = null;
    t.server((input) => {
      receivedInput = input;
      return input;
    });

    const server = createMCPServer({
      name: 'test',
      version: '1.0.0',
      tools: { safe: t },
    });

    await server.callTool('safe', {
      name: 'test',
      __proto__: { isAdmin: true },
      constructor: { prototype: { isAdmin: true } },
    });

    expect(receivedInput).toEqual({ name: 'test' });
    expect(receivedInput.__proto__).toBe(Object.prototype); // normal prototype
    expect(receivedInput.isAdmin).toBeUndefined();
  });

  it('does not allow tool name traversal', async () => {
    const t = tool({
      name: 'safe',
      input: z.object({}),
    });
    t.server(() => ({ ok: true }));

    const server = createMCPServer({
      name: 'test',
      version: '1.0.0',
      tools: { safe: t },
    });

    // Try to access Object.prototype methods via tool name
    await expect(server.callTool('constructor', {})).rejects.toThrow('Unknown tool');
    await expect(server.callTool('__proto__', {})).rejects.toThrow('Unknown tool');
    await expect(server.callTool('toString', {})).rejects.toThrow('Unknown tool');
  });
});
