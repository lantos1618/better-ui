import { describe, it, expect } from '@jest/globals';
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

const tools = { weather: weatherTool, deleteItem: deleteTool };

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
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

    return response.text().then(text => {
      const parsed = JSON.parse(text);
      expect(parsed.openapi).toBe('3.1.0');
      expect(parsed.paths['/api/tools/weather']).toBeDefined();
    });
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

  it('handles CORS preflight', async () => {
    const req = new Request('http://localhost/api/tools/weather', { method: 'OPTIONS' });
    const res = await router(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
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

  it('rejects when onBeforeExecute throws', async () => {
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
    expect(body.error).toBe('Unauthorized');
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
