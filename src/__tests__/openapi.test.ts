import { describe, it, expect, jest } from '@jest/globals';
import { z } from 'zod';
import { tool } from '../tool';
import { generateOpenAPISpec, openAPIHandler, toolRouter } from '../openapi';

const weatherTool = tool({
  name: 'weather',
  description: 'Get weather for a city',
  input: z.object({ city: z.string() }),
  output: z.object({ temp: z.number(), condition: z.string() }),
  tags: ['info'],
  hints: { readOnly: true },
}).server(async ({ city }) => ({ temp: 22, condition: 'sunny' }));

const deleteTool = tool({
  name: 'deleteItem',
  description: 'Delete an item',
  input: z.object({ id: z.string() }),
  confirm: true,
  hints: { destructive: true },
}).server(async ({ id }) => ({ deleted: true }));

// A tool whose input is entirely optional — an empty body would validate,
// so it is the regression case for empty-body-as-undefined executing tools.
const optionalTool = tool({
  name: 'optional',
  description: 'All-optional input',
  input: z.object({ q: z.string().optional() }),
  output: z.object({ ok: z.boolean() }),
}).server(async () => ({ ok: true }));

const tools = { weather: weatherTool, deleteItem: deleteTool, optional: optionalTool };

describe('OpenAPI spec generator', () => {
  const spec = generateOpenAPISpec({
    title: 'Test API',
    version: '1.0.0',
    description: 'Test tools API',
    tools,
    serverUrl: 'https://api.example.com',
  });

  it('generates valid OpenAPI 3.1 structure', () => {
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toBe('Test API');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.info.description).toBe('Test tools API');
    expect(spec.servers[0].url).toBe('https://api.example.com');
  });

  it('creates a POST endpoint per tool', () => {
    expect(spec.paths['/api/tools/weather']).toBeDefined();
    expect(spec.paths['/api/tools/weather'].post.operationId).toBe('weather');
    expect(spec.paths['/api/tools/weather'].post.summary).toBe('Get weather for a city');
    expect(spec.paths['/api/tools/deleteItem']).toBeDefined();
  });

  it('references input schema in request body', () => {
    const ref = spec.paths['/api/tools/weather'].post.requestBody.content['application/json'].schema;
    expect(ref).toEqual({ $ref: '#/components/schemas/weatherInput' });
  });

  it('references output schema in response', () => {
    const content = spec.paths['/api/tools/weather'].post.responses['200'].content;
    expect(content?.['application/json'].schema).toEqual({
      type: 'object',
      properties: { result: { $ref: '#/components/schemas/weatherOutput' } },
    });
  });

  it('generates JSON Schema from Zod input', () => {
    const input = spec.components.schemas['weatherInput'];
    expect(input.type).toBe('object');
    expect(input.properties?.city).toEqual({ type: 'string' });
    expect(input.required).toContain('city');
  });

  it('generates JSON Schema from Zod output', () => {
    const output = spec.components.schemas['weatherOutput'];
    expect(output.type).toBe('object');
    expect(output.properties?.temp).toEqual({ type: 'number' });
    expect(output.properties?.condition).toEqual({ type: 'string' });
  });

  it('includes tool hints in description', () => {
    const desc = spec.paths['/api/tools/weather'].post.description;
    expect(desc).toContain('read-only');
  });

  it('marks destructive/confirm tools', () => {
    const desc = spec.paths['/api/tools/deleteItem'].post.description;
    expect(desc).toContain('destructive');
    expect(desc).toContain('requires confirmation');
  });

  it('includes tags from tools', () => {
    expect(spec.paths['/api/tools/weather'].post.tags).toEqual(['info']);
  });

  it('includes standard error responses', () => {
    expect(spec.paths['/api/tools/weather'].post.responses['400']).toBeDefined();
    expect(spec.paths['/api/tools/weather'].post.responses['404']).toBeDefined();
    expect(spec.paths['/api/tools/weather'].post.responses['500']).toBeDefined();
  });

  it('supports custom basePath', () => {
    const custom = generateOpenAPISpec({
      title: 'Custom',
      version: '1.0.0',
      tools,
      basePath: '/v2/tools',
    });
    expect(custom.paths['/v2/tools/weather']).toBeDefined();
  });
});

describe('openAPIHandler', () => {
  it('returns a JSON response with the spec', () => {
    const handler = openAPIHandler({
      title: 'Handler Test',
      version: '1.0.0',
      tools,
    });

    const response = handler(new Request('http://localhost/openapi.json'));
    expect(response.headers.get('Content-Type')).toBe('application/json');

    return response.text().then(text => {
      const parsed = JSON.parse(text);
      expect(parsed.openapi).toBe('3.1.0');
      expect(parsed.paths['/api/tools/weather']).toBeDefined();
    });
  });

  it('emits no CORS headers by default (same-origin only)', () => {
    const handler = openAPIHandler({ title: 'No CORS', version: '1.0.0', tools });
    const response = handler(
      new Request('http://localhost/openapi.json', {
        headers: { Origin: 'https://evil.example.com' },
      }),
    );
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('echoes a configured origin when it matches the allow-list', () => {
    const handler = openAPIHandler({
      title: 'CORS',
      version: '1.0.0',
      tools,
      cors: { origin: ['https://app.example.com'] },
    });
    const allowed = handler(
      new Request('http://localhost/openapi.json', {
        headers: { Origin: 'https://app.example.com' },
      }),
    );
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');

    const denied = handler(
      new Request('http://localhost/openapi.json', {
        headers: { Origin: 'https://evil.example.com' },
      }),
    );
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('toolRouter', () => {
  const router = toolRouter({ tools });

  it('executes a tool via POST /api/tools/{name}', async () => {
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'Tokyo' }),
    });
    const res = await router(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toBeDefined();
    expect(body.result.temp).toBe(22);
    expect(body.result.condition).toBe('sunny');
  });

  it('returns 404 for unknown tools', async () => {
    const req = new Request('http://localhost/api/tools/nonexistent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await router(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid input', async () => {
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wrong: 'field' }),
    });
    const res = await router(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      body: 'not json',
    });
    const res = await router(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for an empty request body (does not execute all-optional tools)', async () => {
    const req = new Request('http://localhost/api/tools/optional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    });
    const res = await router(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  it('serves OpenAPI spec at GET /api/tools', async () => {
    const req = new Request('http://localhost/api/tools', { method: 'GET' });
    const res = await router(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.openapi).toBe('3.1.0');
    expect(body.paths['/api/tools/weather']).toBeDefined();
  });

  it('serves Swagger UI at GET /api/tools/docs', async () => {
    const req = new Request('http://localhost/api/tools/docs', { method: 'GET' });
    const res = await router(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html');
    const html = await res.text();
    expect(html).toContain('swagger-ui');
  });

  it('emits no CORS headers by default', async () => {
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.com' },
      body: JSON.stringify({ city: 'Tokyo' }),
    });
    const res = await router(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('preflight advertises no CORS when unconfigured', async () => {
    const req = new Request('http://localhost/api/tools/weather', { method: 'OPTIONS' });
    const res = await router(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(res.headers.get('Access-Control-Allow-Methods')).toBeNull();
  });

  it('handles CORS preflight when an origin is configured', async () => {
    const corsRouter = toolRouter({ tools, cors: { origin: 'https://app.example.com' } });
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'OPTIONS',
      headers: { Origin: 'https://app.example.com' },
    });
    const res = await corsRouter(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('echoes a configured origin on tool execution responses', async () => {
    const corsRouter = toolRouter({ tools, cors: { origin: ['https://app.example.com'] } });
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.example.com' },
      body: JSON.stringify({ city: 'Tokyo' }),
    });
    const res = await corsRouter(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
  });

  it('does not echo a non-allowed origin', async () => {
    const corsRouter = toolRouter({ tools, cors: { origin: ['https://app.example.com'] } });
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.com' },
      body: JSON.stringify({ city: 'Tokyo' }),
    });
    const res = await corsRouter(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('rejects oversized bodies with 413 (Content-Length)', async () => {
    const limited = toolRouter({ tools, maxBodyBytes: 10 });
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'A very long city name that exceeds the limit' }),
    });
    const res = await limited(req);
    expect(res.status).toBe(413);
  });

  it('rejects oversized bodies with 413 (streamed body, no Content-Length)', async () => {
    const limited = toolRouter({ tools, maxBodyBytes: 10 });
    // A ReadableStream body has no Content-Length, so the post-read byte-length
    // check is what rejects it.
    const big = new TextEncoder().encode(JSON.stringify({ city: 'x'.repeat(1000) }));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(big);
        controller.close();
      },
    });
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      // @ts-expect-error duplex is required for streamed request bodies (undici)
      duplex: 'half',
    });
    const res = await limited(req);
    expect(res.status).toBe(413);
  });

  it('allows bodies within the size limit', async () => {
    const limited = toolRouter({ tools, maxBodyBytes: 1000 });
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'Tokyo' }),
    });
    const res = await limited(req);
    expect(res.status).toBe(200);
  });

  it('calls onBeforeExecute hook', async () => {
    let hookCalled = false;
    const guarded = toolRouter({
      tools,
      onBeforeExecute: (name, input) => { hookCalled = true; },
    });
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'London' }),
    });
    await guarded(req);
    expect(hookCalled).toBe(true);
  });

  it('rejects when onBeforeExecute throws (generic message by default)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const guarded = toolRouter({
      tools,
      onBeforeExecute: () => { throw new Error('Unauthorized'); },
    });
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'London' }),
    });
    const res = await guarded(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    // Raw error detail must NOT leak to the client by default.
    expect(body.error).toBe('Internal server error');
    expect(body.error).not.toContain('Unauthorized');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('surfaces the error message when debug is enabled', async () => {
    const guarded = toolRouter({
      tools,
      debug: true,
      onBeforeExecute: () => { throw new Error('Unauthorized'); },
    });
    const req = new Request('http://localhost/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'London' }),
    });
    const res = await guarded(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('pins the Swagger UI version and JSON-encodes basePath', async () => {
    const custom = toolRouter({ tools, basePath: '/v2/tools' });
    const req = new Request('http://localhost/v2/tools/docs', { method: 'GET' });
    const res = await custom(req);
    const html = await res.text();
    expect(html).toContain('swagger-ui-dist@5.17.14');
    // basePath must be interpolated via JSON.stringify (quoted), not raw.
    expect(html).toContain('url:"/v2/tools"');
    expect(html).not.toContain("swagger-ui-dist@5/");
  });

  it('prevents prototype pollution on tool lookup', async () => {
    const req = new Request('http://localhost/api/tools/constructor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await router(req);
    expect(res.status).toBe(404);
  });
});
