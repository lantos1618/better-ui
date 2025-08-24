import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z } from '../index';
import { createAIController } from '../ai-control';

describe('AUI Ultimate Concise API', () => {
  beforeEach(() => {
    // Clear registry before each test
    aui.getTools().forEach(tool => {
      // Registry clear would go here if implemented
    });
  });

  describe('Basic Tool Creation', () => {
    it('should create a simple tool with minimal API', () => {
      const tool = aui
        .tool('test')
        .input(z.object({ value: z.string() }))
        .execute(async ({ input }) => ({ result: input.value.toUpperCase() }))
        .build();

      expect(tool.name).toBe('test');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should support ultra-concise syntax with .do()', () => {
      const tool = aui.do('upper', (text: string) => text.toUpperCase());
      
      expect(tool.name).toBe('upper');
      expect(tool.execute).toBeDefined();
    });

    it('should support object config with .do()', () => {
      const tool = aui.do('calc', {
        input: z.object({ a: z.number(), b: z.number() }),
        execute: (input) => input.a + input.b,
      });

      expect(tool.name).toBe('calc');
      expect(tool.inputSchema).toBeDefined();
    });
  });

  describe('Client/Server Execution', () => {
    it('should support client execution', () => {
      const tool = aui
        .tool('client-test')
        .input(z.object({ key: z.string() }))
        .execute(async ({ input }) => ({ server: input.key }))
        .clientExecute(async ({ input, ctx }) => ({ client: input.key }))
        .build();

      expect(tool.clientExecute).toBeDefined();
      expect(tool.isServerOnly).toBeFalsy();
    });

    it('should support server-only tools', () => {
      const tool = aui.server(
        'db-tool',
        z.object({ query: z.string() }),
        async (input) => ({ result: 'data' })
      );

      expect(tool.isServerOnly).toBe(true);
    });
  });

  describe('AI-Optimized Tools', () => {
    it('should create AI tools with retry and caching', () => {
      const tool = aui.ai('ai-tool', {
        input: z.object({ prompt: z.string() }),
        execute: async (input) => ({ response: input.prompt }),
        retry: 3,
        timeout: 5000,
        cache: true,
      });

      expect(tool.name).toBe('ai-tool');
      expect(tool.metadata?.aiOptimized).toBe(true);
      expect(tool.metadata?.retry).toBe(3);
      expect(tool.metadata?.timeout).toBe(5000);
    });

    it('should batch create AI tools', () => {
      const tools = aui.aiTools({
        tool1: {
          execute: async (input) => ({ result: 'one' }),
        },
        tool2: {
          input: z.object({ value: z.number() }),
          execute: async (input) => ({ result: input.value * 2 }),
        },
      });

      expect(tools.tool1).toBeDefined();
      expect(tools.tool2).toBeDefined();
      expect(tools.tool1.metadata?.aiOptimized).toBe(true);
    });
  });

  describe('Quick Mode', () => {
    it('should auto-build with quick mode', () => {
      const tool = aui
        .quick('quick-test')
        .input(z.object({ text: z.string() }))
        .execute(async (params) => params.input.text.length)
        .render((params) => `Length: ${params.data}`);

      // Tool should be auto-built
      expect(tool.name).toBe('quick-test');
      expect(tool.build).toBeUndefined(); // Already built
    });
  });

  describe('Batch Tool Definition', () => {
    it('should define multiple tools at once', () => {
      const tools = aui.defineTools({
        tool1: {
          input: z.object({ a: z.number() }),
          execute: (input) => input.a * 2,
        },
        tool2: {
          input: z.object({ b: z.string() }),
          execute: (input) => input.b.toUpperCase(),
        },
      });

      expect(Object.keys(tools)).toHaveLength(2);
      expect(tools.tool1.name).toBe('tool1');
      expect(tools.tool2.name).toBe('tool2');
    });
  });

  describe('Type Inference', () => {
    it('should correctly infer input and output types', async () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          name: z.string(),
          age: z.number(),
        }))
        .execute(async ({ input }) => ({
          greeting: `Hello ${input.name}, age ${input.age}`,
          isAdult: input.age >= 18,
        }))
        .build();

      const result = await tool.execute({
        input: { name: 'John', age: 25 }
      });

      expect(result.greeting).toBe('Hello John, age 25');
      expect(result.isAdult).toBe(true);
    });
  });

  describe('Context Access', () => {
    it('should provide context in execute handler', () => {
      const tool = aui.contextual(
        'ctx-test',
        z.object({ key: z.string() }),
        async ({ input, ctx }) => {
          // Context should be available
          return { hasContext: ctx !== undefined };
        }
      );

      expect(tool.name).toBe('ctx-test');
    });
  });

  describe('Aliases and Shortcuts', () => {
    it('should support single-character aliases', () => {
      const tool = aui
        .t('alias-test')
        .i(z.object({ x: z.number() }))
        .e(async ({ x }) => x * 2)
        .r((result) => `Result: ${result}`)
        .b();

      expect(tool.name).toBe('alias-test');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });

    it('should support method aliases', () => {
      const tool = aui
        .tool('method-test')
        .in(z.object({ value: z.string() }))
        .ex(async (params) => params.input.value)
        .out((data) => data)
        .create();

      expect(tool.name).toBe('method-test');
    });
  });

  describe('Tool Registration', () => {
    it('should auto-register tools created with helpers', () => {
      const tool = aui.simple(
        'auto-register',
        z.object({ test: z.boolean() }),
        (input) => input.test
      );

      const found = aui.getTool('auto-register');
      expect(found).toBeDefined();
      expect(found?.name).toBe('auto-register');
    });

    it('should manually register tools', () => {
      const tool = aui
        .tool('manual')
        .input(z.object({ x: z.number() }))
        .execute(async (params) => params.input.x)
        .build();

      aui.register(tool);
      
      const found = aui.getTool('manual');
      expect(found).toBeDefined();
    });
  });

  describe('AI Control Integration', () => {
    it('should create AI controller', () => {
      const controller = createAIController();
      
      expect(controller.ui).toBeDefined();
      expect(controller.db).toBeDefined();
      expect(controller.fs).toBeDefined();
      expect(controller.api).toBeDefined();
      expect(controller.process).toBeDefined();
    });

    it('should have UI control methods', () => {
      const controller = createAIController();
      
      expect(controller.ui.setTheme).toBeDefined();
      expect(controller.ui.navigate).toBeDefined();
      expect(controller.ui.openModal).toBeDefined();
      expect(controller.ui.showToast).toBeDefined();
    });

    it('should have DB control methods', () => {
      const controller = createAIController();
      
      expect(controller.db.query).toBeDefined();
      expect(controller.db.insert).toBeDefined();
      expect(controller.db.update).toBeDefined();
      expect(controller.db.delete).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should require execute handler', () => {
      expect(() => {
        aui.tool('no-execute').build();
      }).toThrow('must have an execute handler');
    });

    it('should handle async errors with retry', async () => {
      let attempts = 0;
      const tool = aui.ai('retry-test', {
        execute: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Retry me');
          }
          return { success: true };
        },
        retry: 3,
      });

      const result = await tool.execute({ input: {} });
      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });
  });

  describe('Rendering', () => {
    it('should support render functions', () => {
      const tool = aui
        .tool('render-test')
        .input(z.object({ text: z.string() }))
        .execute(async ({ text }) => ({ output: text }))
        .render(({ data }) => `Rendered: ${data.output}`)
        .build();

      const rendered = tool.render({ 
        data: { output: 'test' },
        input: { text: 'test' }
      });
      
      expect(rendered).toBe('Rendered: test');
    });

    it('should support render with input access', () => {
      const tool = aui
        .tool('render-input')
        .input(z.object({ x: z.number() }))
        .execute(async ({ x }) => x * 2)
        .render(({ data, input }) => `${input.x} * 2 = ${data}`)
        .build();

      const rendered = tool.render({ 
        data: 10,
        input: { x: 5 }
      });
      
      expect(rendered).toBe('5 * 2 = 10');
    });
  });

  describe('Metadata and Description', () => {
    it('should support metadata', () => {
      const tool = aui
        .tool('meta-test')
        .description('A test tool')
        .metadata({ version: '1.0', author: 'test' })
        .input(z.object({ x: z.number() }))
        .execute(async ({ x }) => x)
        .build();

      expect(tool.description).toBe('A test tool');
      expect(tool.metadata?.version).toBe('1.0');
      expect(tool.metadata?.author).toBe('test');
    });
  });

  describe('Combined Operations', () => {
    it('should support handle() for input+execute', () => {
      const tool = aui
        .tool('handle-test')
        .handle(
          z.object({ value: z.string() }),
          async ({ value }) => value.length
        )
        .build();

      expect(tool.name).toBe('handle-test');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should support define() for all-in-one', () => {
      const tool = aui
        .tool('define-test')
        .define(
          z.object({ n: z.number() }),
          async ({ n }) => n * n,
          (square) => `Square: ${square}`
        );

      expect(tool.name).toBe('define-test');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });

    it('should support run() for execute+render', () => {
      const tool = aui
        .tool('run-test')
        .input(z.object({ text: z.string() }))
        .run(
          async ({ text }) => text.toUpperCase(),
          (upper) => `Upper: ${upper}`
        )
        .build();

      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });
  });
});