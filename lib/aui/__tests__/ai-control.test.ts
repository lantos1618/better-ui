import { createAITool, AIControlledTool, aiControlSystem, createAIControlSystem } from '../ai-control';
import { z } from 'zod';

describe('AI Control System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AIControlledTool', () => {
    it('creates a tool with permissions', () => {
      const tool = createAITool('test-tool')
        .withPermissions({
          allowClientExecution: true,
          allowServerExecution: false
        })
        .input(z.object({ action: z.string() }))
        .execute(async ({ input }) => ({ result: input.action }));

      expect(tool).toBeInstanceOf(AIControlledTool);
      expect(tool.name).toBe('test-tool');
    });

    it('enforces client execution permissions', async () => {
      const tool = createAITool('restricted-tool')
        .withPermissions({ allowClientExecution: false })
        .execute(async () => 'result');

      await expect(
        tool.run({}, { isServer: false, cache: new Map(), fetch: globalThis.fetch })
      ).rejects.toThrow('Client execution not allowed');
    });

    it('enforces server execution permissions', async () => {
      const tool = createAITool('client-only-tool')
        .withPermissions({ allowServerExecution: false })
        .execute(async () => 'result');

      await expect(
        tool.run({}, { isServer: true, cache: new Map(), fetch: globalThis.fetch })
      ).rejects.toThrow('Server execution not allowed');
    });

    it('tracks execution in audit log', async () => {
      const tool = createAITool('audited-tool')
        .enableAudit()
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => input.value * 2);

      await tool.run({ value: 5 });
      await tool.run({ value: 10 });

      const log = tool.getExecutionLog();
      expect(log).toHaveLength(2);
      expect(log[0].input).toEqual({ value: 5 });
      expect(log[0].output).toBe(10);
      expect(log[1].input).toEqual({ value: 10 });
      expect(log[1].output).toBe(20);
    });

    it('enforces rate limiting per minute', async () => {
      const tool = createAITool('rate-limited')
        .withRateLimit({ requestsPerMinute: 2 })
        .enableAudit()
        .execute(async () => 'ok');

      await tool.run({});
      await tool.run({});
      
      await expect(tool.run({})).rejects.toThrow('Rate limit exceeded');
    });

    it('logs errors in audit log', async () => {
      const tool = createAITool('error-tool')
        .enableAudit()
        .execute(async () => {
          throw new Error('Test error');
        });

      try {
        await tool.run({});
      } catch {}

      const log = tool.getExecutionLog();
      expect(log).toHaveLength(1);
      expect(log[0].error?.message).toBe('Test error');
    });

    it('clears execution log', async () => {
      const tool = createAITool('clearable-tool')
        .enableAudit()
        .execute(async () => 'done');

      await tool.run({});
      expect(tool.getExecutionLog()).toHaveLength(1);

      tool.clearExecutionLog();
      expect(tool.getExecutionLog()).toHaveLength(0);
    });
  });

  describe('AI Control System', () => {
    it('registers and retrieves tools', () => {
      const tool = createAITool('system-tool')
        .execute(async () => 'result');

      aiControlSystem.register(tool);
      const retrieved = aiControlSystem.get('system-tool');
      
      expect(retrieved).toBe(tool);
    });

    it('executes tools through the system', async () => {
      const tool = createAITool('executable-tool')
        .input(z.object({ message: z.string() }))
        .execute(async ({ input }) => `Echo: ${input.message}`);

      aiControlSystem.register(tool);
      
      const result = await aiControlSystem.execute(
        'executable-tool',
        { message: 'Hello' }
      );
      
      expect(result).toBe('Echo: Hello');
    });

    it('lists all registered tools', () => {
      // Clear and re-register for clean test
      const tool1 = createAITool('tool-1')
        .describe('First tool')
        .tag('test')
        .execute(async () => null);
      
      const tool2 = createAITool('tool-2')
        .describe('Second tool')
        .tag('test', 'demo')
        .execute(async () => null);

      aiControlSystem.register(tool1);
      aiControlSystem.register(tool2);

      const tools = aiControlSystem.listTools();
      const toolNames = tools.map(t => t.name);
      
      expect(toolNames).toContain('tool-1');
      expect(toolNames).toContain('tool-2');
    });

    it('retrieves audit logs for specific tools', async () => {
      const tool = createAITool('logged-tool')
        .enableAudit()
        .execute(async () => 'done');

      aiControlSystem.register(tool);
      
      await aiControlSystem.execute('logged-tool', {});
      await aiControlSystem.execute('logged-tool', {});

      const logs = aiControlSystem.getAuditLog('logged-tool');
      expect(logs).toHaveLength(2);
    });

    it('retrieves combined audit logs sorted by timestamp', async () => {
      // Create a separate control system for this test
      const testSystem = createAIControlSystem();
      
      const tool1 = createAITool('tool-a')
        .enableAudit()
        .execute(async () => 'a');
      
      const tool2 = createAITool('tool-b')
        .enableAudit()
        .execute(async () => 'b');

      testSystem.register(tool1);
      testSystem.register(tool2);

      await testSystem.execute('tool-a', {});
      await new Promise(resolve => setTimeout(resolve, 10));
      await testSystem.execute('tool-b', {});

      const logs = testSystem.getAuditLog();
      
      // Should be sorted with most recent first
      expect(logs[0].tool).toBe('tool-b');
      expect(logs[1].tool).toBe('tool-a');
    });

    it('throws error for non-existent tools', async () => {
      await expect(
        aiControlSystem.execute('non-existent', {})
      ).rejects.toThrow('Tool non-existent not found');
    });
  });

  describe('Predefined AI Tools', () => {
    it('has fileSystem tool with correct permissions', () => {
      const fsTool = aiControlSystem.get('fs-control');
      expect(fsTool).toBeDefined();
      
      const config = fsTool?.getConfig();
      expect(config).toBeDefined();
    });

    it('has database tool with rate limiting', () => {
      const dbTool = aiControlSystem.get('db-control');
      expect(dbTool).toBeDefined();
    });

    it('has UI manipulation tool for client-side', () => {
      const uiTool = aiControlSystem.get('ui-control');
      expect(uiTool).toBeDefined();
    });

    it('has API call tool with network permissions', () => {
      const apiTool = aiControlSystem.get('api-control');
      expect(apiTool).toBeDefined();
    });
  });
});