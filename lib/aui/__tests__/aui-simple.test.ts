import aui from '../index';
import { z } from 'zod';

describe('AUI Simple API', () => {
  it('creates a simple tool with just 2 methods', () => {
    const simpleTool = aui
      .tool('weather')
      .input(z.object({ city: z.string() }))
      .execute(async ({ input }) => ({ temp: 72, city: input.city }));
    
    expect(simpleTool.name).toBe('weather');
    expect(simpleTool.schema).toBeDefined();
  });

  it('executes a simple tool', async () => {
    const simpleTool = aui
      .tool('weather')
      .input(z.object({ city: z.string() }))
      .execute(async ({ input }) => ({ temp: 72, city: input.city }));
    
    const result = await simpleTool.run({ city: 'NYC' });
    expect(result).toEqual({ temp: 72, city: 'NYC' });
  });

  it('creates a complex tool with client execution', () => {
    const complexTool = aui
      .tool('search')
      .input(z.object({ query: z.string() }))
      .execute(async ({ input }) => [`Result for ${input.query}`])
      .clientExecute(async ({ input, ctx }) => {
        const cached = ctx.cache.get(input.query);
        return cached || [`Cached result for ${input.query}`];
      });
    
    expect(complexTool.name).toBe('search');
    const config = complexTool.getConfig();
    expect(config.clientHandler).toBeDefined();
  });

  it('supports middleware', async () => {
    let middlewareCalled = false;
    
    const tool = aui
      .tool('test')
      .middleware(async ({ input, next }) => {
        middlewareCalled = true;
        return next();
      })
      .execute(async () => 'done');
    
    await tool.run({});
    expect(middlewareCalled).toBe(true);
  });

  it('validates input with zod schema', async () => {
    const tool = aui
      .tool('validated')
      .input(z.object({ 
        email: z.string().email() 
      }))
      .execute(async ({ input }) => input);
    
    await expect(tool.run({ email: 'invalid' })).rejects.toThrow();
    
    const result = await tool.run({ email: 'test@example.com' });
    expect(result.email).toBe('test@example.com');
  });

  it('uses client handler when not on server', async () => {
    const tool = aui
      .tool('hybrid')
      .execute(async () => 'server result')
      .clientExecute(async () => 'client result');
    
    const serverResult = await tool.run({}, { isServer: true });
    expect(serverResult).toBe('server result');
    
    const clientResult = await tool.run({}, { isServer: false });
    expect(clientResult).toBe('client result');
  });

  it('supports tags and description', () => {
    const tool = aui
      .tool('tagged')
      .tag('user', 'mutation')
      .describe('A tagged tool')
      .execute(async () => null);
    
    expect(tool.tags).toContain('user');
    expect(tool.tags).toContain('mutation');
    expect(tool.description).toBe('A tagged tool');
  });

  it('finds tools by tags', () => {
    aui.clear(); // Clear any existing tools
    
    aui.tool('tool1').tag('api').execute(async () => null);
    aui.tool('tool2').tag('api', 'user').execute(async () => null);
    aui.tool('tool3').tag('user').execute(async () => null);
    
    const apiTools = aui.findByTag('api');
    expect(apiTools).toHaveLength(2);
    
    const userApiTools = aui.findByTags('api', 'user');
    expect(userApiTools).toHaveLength(1);
    expect(userApiTools[0].name).toBe('tool2');
  });
});