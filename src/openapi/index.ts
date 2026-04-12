/**
 * OpenAPI 3.1 spec generator for Better UI tools.
 *
 * Converts a tool registry into a valid OpenAPI document.
 * Each tool becomes a POST endpoint at `/api/tools/{toolName}`.
 *
 * @example
 * ```typescript
 * import { generateOpenAPISpec } from '@lantos1618/better-ui/openapi';
 * import { tools } from './tools';
 *
 * const spec = generateOpenAPISpec({
 *   title: 'My AI Tools API',
 *   version: '1.0.0',
 *   tools,
 * });
 *
 * // Serve as JSON
 * app.get('/openapi.json', (req, res) => res.json(spec));
 * ```
 */

import type { Tool } from '../tool';
import { zodToJsonSchema, type JsonSchema } from '../mcp/schema';

export interface OpenAPISpecConfig {
  /** API title */
  title: string;
  /** API version */
  version: string;
  /** Tool registry */
  tools: Record<string, Tool>;
  /** API description */
  description?: string;
  /** Base URL for servers (default: '/') */
  serverUrl?: string;
  /** Base path prefix for tool endpoints (default: '/api/tools') */
  basePath?: string;
  /** Tags to group endpoints */
  tags?: Array<{ name: string; description?: string }>;
}

export interface OpenAPISpec {
  openapi: '3.1.0';
  info: { title: string; version: string; description?: string };
  servers: Array<{ url: string }>;
  paths: Record<string, PathItem>;
  components: { schemas: Record<string, JsonSchema> };
  tags?: Array<{ name: string; description?: string }>;
}

interface PathItem {
  post: {
    operationId: string;
    summary: string;
    description?: string;
    tags?: string[];
    requestBody: {
      required: true;
      content: { 'application/json': { schema: { $ref: string } } };
    };
    responses: Record<string, {
      description: string;
      content?: { 'application/json': { schema: { $ref: string } | JsonSchema } };
    }>;
  };
}

/**
 * Generate an OpenAPI 3.1 spec from a Better UI tool registry.
 */
export function generateOpenAPISpec(config: OpenAPISpecConfig): OpenAPISpec {
  const basePath = config.basePath ?? '/api/tools';
  const paths: Record<string, PathItem> = {};
  const schemas: Record<string, JsonSchema> = {};

  // Build tag list from tool tags
  const autoTags = new Set<string>();

  for (const [key, tool] of Object.entries(config.tools)) {
    const name = tool.name || key;
    const inputSchemaName = `${name}Input`;
    const outputSchemaName = `${name}Output`;

    // Convert Zod schemas to JSON Schema
    schemas[inputSchemaName] = zodToJsonSchema(tool.inputSchema);
    if (tool.outputSchema) {
      schemas[outputSchemaName] = zodToJsonSchema(tool.outputSchema);
    }

    // Collect tags
    const toolTags = tool.tags.length > 0 ? tool.tags : [name];
    for (const t of toolTags) autoTags.add(t);

    // Build response schema
    const responseSchema: JsonSchema | { $ref: string } = tool.outputSchema
      ? { $ref: `#/components/schemas/${outputSchemaName}` }
      : { type: 'object' };

    // Build hints description
    const hints: string[] = [];
    if (tool.hints.destructive) hints.push('destructive');
    if (tool.hints.readOnly) hints.push('read-only');
    if (tool.hints.idempotent) hints.push('idempotent');
    if (tool.requiresConfirmation) hints.push('requires confirmation');
    const hintsStr = hints.length > 0 ? ` [${hints.join(', ')}]` : '';

    paths[`${basePath}/${name}`] = {
      post: {
        operationId: name,
        summary: tool.description || name,
        description: (tool.description || '') + hintsStr,
        tags: tool.tags.length > 0 ? tool.tags : undefined,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${inputSchemaName}` },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful tool execution',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: responseSchema,
                  },
                } as JsonSchema,
              },
            },
          },
          '400': {
            description: 'Invalid input (Zod validation error)',
          },
          '404': {
            description: 'Tool not found',
          },
          '500': {
            description: 'Tool execution failed',
          },
        },
      },
    };
  }

  // Build tags array
  const tags = config.tags ?? [...autoTags].map(t => ({ name: t }));

  return {
    openapi: '3.1.0',
    info: {
      title: config.title,
      version: config.version,
      ...(config.description ? { description: config.description } : {}),
    },
    servers: [{ url: config.serverUrl ?? '/' }],
    paths,
    components: { schemas },
    ...(tags.length > 0 ? { tags } : {}),
  };
}

/**
 * Create a request handler that serves the OpenAPI spec as JSON.
 *
 * @example
 * ```typescript
 * // Next.js route: app/api/openapi/route.ts
 * export const GET = openAPIHandler({
 *   title: 'My Tools',
 *   version: '1.0.0',
 *   tools,
 * });
 * ```
 */
export function openAPIHandler(config: OpenAPISpecConfig): (req: Request) => Response {
  const spec = generateOpenAPISpec(config);
  const json = JSON.stringify(spec, null, 2);
  return () => new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export interface ToolRouterConfig {
  /** Tool registry */
  tools: Record<string, Tool>;
  /** Base path prefix (default: '/api/tools') */
  basePath?: string;
  /** Optional context passed to every tool execution */
  context?: Partial<import('../tool').ToolContext>;
  /** Called before tool execution — throw to reject */
  onBeforeExecute?: (toolName: string, input: unknown, req: Request) => Promise<void> | void;
}

/**
 * Create a request handler that routes to individual tool endpoints.
 * Each tool is callable at `POST {basePath}/{toolName}`.
 *
 * Also serves the OpenAPI spec at `GET {basePath}` and a Swagger UI at `GET {basePath}/docs`.
 *
 * @example
 * ```typescript
 * // Next.js catch-all: app/api/tools/[...path]/route.ts
 * import { toolRouter } from '@lantos1618/better-ui/openapi';
 * const router = toolRouter({ tools });
 * export const GET = router;
 * export const POST = router;
 *
 * // Now callable:
 * // POST /api/tools/weather  { "city": "Tokyo" }  -> { "result": { "temp": 22, ... } }
 * // GET  /api/tools           -> OpenAPI JSON spec
 * // GET  /api/tools/docs      -> Swagger UI
 * ```
 */
export function toolRouter(config: ToolRouterConfig): (req: Request) => Promise<Response> {
  const basePath = config.basePath ?? '/api/tools';

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // GET {basePath} -> OpenAPI spec
    if (req.method === 'GET' && (path === basePath || path === basePath + '/')) {
      const spec = generateOpenAPISpec({
        title: 'Tool API',
        version: '1.0.0',
        tools: config.tools,
        basePath,
        serverUrl: url.origin,
      });
      return new Response(JSON.stringify(spec, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // GET {basePath}/docs -> Swagger UI
    if (req.method === 'GET' && (path === basePath + '/docs' || path === basePath + '/docs/')) {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body><div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:'${basePath}',dom_id:'#swagger-ui',deepLinking:true});</script>
</body></html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // POST {basePath}/{toolName} -> execute tool
    if (req.method === 'POST' && path.startsWith(basePath + '/')) {
      const toolName = path.slice(basePath.length + 1).replace(/\/$/, '');

      if (!toolName) {
        return Response.json({ error: 'Missing tool name' }, { status: 400 });
      }

      if (!Object.prototype.hasOwnProperty.call(config.tools, toolName)) {
        return Response.json({ error: 'Tool not found' }, { status: 404 });
      }

      const tool = config.tools[toolName];

      let input: unknown;
      try {
        input = await req.json();
      } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      try {
        if (config.onBeforeExecute) {
          await config.onBeforeExecute(toolName, input, req);
        }

        const result = await tool.run(input, {
          isServer: true,
          headers: req.headers,
          ...config.context,
        });

        return Response.json({ result }, {
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          return Response.json({ error: error.message }, { status: 400 });
        }
        return Response.json(
          { error: error instanceof Error ? error.message : 'Tool execution failed' },
          { status: 500 },
        );
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  };
}
