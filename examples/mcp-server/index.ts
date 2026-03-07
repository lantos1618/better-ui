#!/usr/bin/env node
/**
 * Example: Expose Better UI tools as an MCP server
 *
 * Usage:
 *   npx tsx examples/mcp-server/index.ts
 *
 * Claude Desktop config (~/.claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "better-ui-tools": {
 *         "command": "npx",
 *         "args": ["tsx", "/path/to/better-ui/examples/mcp-server/index.ts"]
 *       }
 *     }
 *   }
 */

import { tool } from '../../src';
import { createMCPServer } from '../../src/mcp';
import { z } from 'zod';

// ─── Define your tools ─────────────────────────────────────────────────────

const weatherTool = tool({
  name: 'weather',
  description: 'Get current weather for a city',
  input: z.object({ city: z.string().describe('City name') }),
  output: z.object({
    temp: z.number(),
    city: z.string(),
    condition: z.string(),
  }),
});

weatherTool.server(async ({ city }) => {
  const temp = Math.floor(Math.random() * 30) + 10;
  return { temp, city, condition: temp > 20 ? 'sunny' : 'cloudy' };
});

const calcTool = tool({
  name: 'calculator',
  description: 'Perform basic math operations',
  input: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  output: z.object({ result: z.number() }),
});

calcTool.server(({ operation, a, b }) => {
  switch (operation) {
    case 'add': return { result: a + b };
    case 'subtract': return { result: a - b };
    case 'multiply': return { result: a * b };
    case 'divide':
      if (b === 0) throw new Error('Division by zero');
      return { result: a / b };
  }
});

// ─── Create and start the MCP server ────────────────────────────────────────

const server = createMCPServer({
  name: 'better-ui-example',
  version: '0.1.0',
  tools: {
    weather: weatherTool,
    calculator: calcTool,
  },
  onStart: () => {
    process.stderr.write('Better UI MCP server started\n');
  },
  onError: (error) => {
    process.stderr.write(`MCP error: ${error.message}\n`);
  },
});

server.start();
