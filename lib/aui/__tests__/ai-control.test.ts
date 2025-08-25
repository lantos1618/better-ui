import { aiControlTools } from '../examples/ai-complete-control';
import { AUIContext } from '../index';

describe('AI Control Tools', () => {
  let mockContext: AUIContext;

  beforeEach(() => {
    mockContext = {
      cache: new Map(),
      fetch: jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Map(),
      }),
      isServer: false,
    };

    // Mock WebSocket
    (global as any).WebSocket = jest.fn().mockImplementation(() => ({
      readyState: 1, // OPEN
      send: jest.fn(),
      close: jest.fn(),
    }));
    
    // Define OPEN constant on WebSocket
    (global as any).WebSocket.OPEN = 1;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('State Management Tool', () => {
    it('should set and get state values', async () => {
      const { stateManagementTool } = aiControlTools;
      
      // Set a value
      const setResult = await stateManagementTool.run(
        { action: 'set', key: 'user', value: { name: 'AI Agent' } },
        mockContext
      );
      expect(setResult.action).toBe('set');
      expect(setResult.value).toEqual({ name: 'AI Agent' });

      // Get the value
      const getResult = await stateManagementTool.run(
        { action: 'get', key: 'user', value: undefined },
        mockContext
      );
      expect(getResult.action).toBe('get');
      expect(getResult.value).toEqual({ name: 'AI Agent' });
    });

    it('should update existing state', async () => {
      const { stateManagementTool } = aiControlTools;
      
      await stateManagementTool.run(
        { action: 'set', key: 'config', value: { theme: 'light' } },
        mockContext
      );

      const updateResult = await stateManagementTool.run(
        { action: 'update', key: 'config', value: { lang: 'en' } },
        mockContext
      );
      
      expect(updateResult.value).toEqual({ theme: 'light', lang: 'en' });
    });
  });

  describe('DOM Manipulation Tool', () => {
    it('should have correct tool configuration', () => {
      const { domTool } = aiControlTools;
      
      expect(domTool.name).toBe('dom-manipulation');
      expect(domTool.description).toBe('Direct DOM manipulation capabilities');
      expect(domTool.schema).toBeDefined();
    });
  });

  describe('Navigation Tool', () => {
    it('should have correct tool configuration', () => {
      const { navigationTool } = aiControlTools;
      
      expect(navigationTool.name).toBe('navigation');
      expect(navigationTool.description).toBe('Control app navigation and routing');
      expect(navigationTool.schema).toBeDefined();
    });
  });

  describe('API Tool', () => {
    it('should make API requests', async () => {
      const { apiTool } = aiControlTools;
      
      // Mock fetch properly for this test
      const mockFetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Map(),
      });
      
      // Override global fetch
      global.fetch = mockFetch as any;
      
      const result = await apiTool.run(
        {
          method: 'POST',
          endpoint: 'http://localhost:3000/api/test',  // Use full URL
          body: { data: 'test' },
          headers: { 'X-Custom': 'header' },
        },
        { ...mockContext, fetch: mockFetch }
      );
      
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/test', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Custom': 'header',
        }),
      }));
    });

    it('should cache GET requests on client', async () => {
      const { apiTool } = aiControlTools;
      (global as any).fetch = jest.fn().mockResolvedValue({
        json: async () => ({ data: 'cached' }),
        status: 200,
        headers: new Map(),
      });

      // First request
      await apiTool.run(
        { method: 'GET', endpoint: '/api/data' },
        mockContext
      );
      
      // Second request (should use cache)
      await apiTool.run(
        { method: 'GET', endpoint: '/api/data' },
        mockContext
      );
      
      // Fetch should only be called once due to caching
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Database Tool', () => {
    it('should perform database queries', async () => {
      const { dbTool } = aiControlTools;
      
      const result = await dbTool.run(
        { operation: 'query', table: 'users' },
        { ...mockContext, isServer: true }
      );
      
      expect(result.operation).toBe('query');
      expect(result.results).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should handle insert operations', async () => {
      const { dbTool } = aiControlTools;
      
      const result = await dbTool.run(
        { 
          operation: 'insert', 
          table: 'users', 
          data: { name: 'AI User', email: 'ai@example.com' } 
        },
        { ...mockContext, isServer: true }
      );
      
      expect(result.operation).toBe('insert');
      expect(result.id).toBeDefined();
      expect(result.data).toEqual({ name: 'AI User', email: 'ai@example.com' });
    });

    it('should handle transactions', async () => {
      const { dbTool } = aiControlTools;
      
      const result = await dbTool.run(
        {
          operation: 'transaction',
          table: 'multi',
          transaction: [
            { operation: 'insert', table: 'users', data: { name: 'User 1' } },
            { operation: 'update', table: 'settings', data: { theme: 'dark' } },
          ],
        },
        { ...mockContext, isServer: true }
      );
      
      expect(result.success).toBe(true);
      expect(result.operations).toBe(2);
    });
  });

  describe('WebSocket Tool', () => {
    it('should connect to WebSocket', async () => {
      const { websocketTool } = aiControlTools;
      
      const result = await websocketTool.run(
        { action: 'connect', url: 'ws://localhost:3000' },
        mockContext
      );
      
      expect(result.action).toBe('connect');
      expect(result.url).toBe('ws://localhost:3000');
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000');
    });

    it('should send messages', async () => {
      const { websocketTool } = aiControlTools;
      
      // First connect
      await websocketTool.run(
        { action: 'connect', url: 'ws://localhost:3000' },
        mockContext
      );
      
      // Then send message
      const result = await websocketTool.run(
        { action: 'send', message: { type: 'chat', text: 'Hello AI' } },
        mockContext
      );
      
      expect(result.sent).toBe(true);
    });
  });

  describe('File System Tool', () => {
    it('should read files', async () => {
      const { fileSystemTool } = aiControlTools;
      
      const result = await fileSystemTool.run(
        { operation: 'read', path: '/tmp/test.txt', encoding: 'utf8' },
        { ...mockContext, isServer: true }
      );
      
      expect(result.operation).toBe('read');
      expect(result.content).toContain('Mock content');
    });

    it('should list directory contents', async () => {
      const { fileSystemTool } = aiControlTools;
      
      const result = await fileSystemTool.run(
        { operation: 'list', path: '/tmp', encoding: 'utf8' },
        { ...mockContext, isServer: true }
      );
      
      expect(result.operation).toBe('list');
      expect(result.files).toContain('file1.txt');
      expect(result.files).toContain('dir/');
    });
  });

  describe('Process Management Tool', () => {
    it('should spawn new processes', async () => {
      const { processTool } = aiControlTools;
      
      const result = await processTool.run(
        { action: 'spawn', command: 'node', args: ['server.js'] },
        { ...mockContext, isServer: true }
      );
      
      expect(result.action).toBe('spawn');
      expect(result.pid).toBeDefined();
      expect(result.status).toBe('running');
    });

    it('should list running processes', async () => {
      const { processTool } = aiControlTools;
      
      const result = await processTool.run(
        { action: 'list' },
        { ...mockContext, isServer: true }
      );
      
      expect(result.action).toBe('list');
      expect(result.processes).toHaveLength(2);
      expect(result.processes[0]).toHaveProperty('pid');
      expect(result.processes[0]).toHaveProperty('status');
    });
  });

  describe('Tool Integration', () => {
    it('should work together for complex operations', async () => {
      const { stateManagementTool, apiTool, dbTool } = aiControlTools;
      
      // 1. Make API call to get data
      const apiResult = await apiTool.run(
        { method: 'GET', endpoint: '/api/user' },
        mockContext
      );
      
      // 2. Store in state
      await stateManagementTool.run(
        { action: 'set', key: 'currentUser', value: apiResult.data },
        mockContext
      );
      
      // 3. Perform database operation
      const dbResult = await dbTool.run(
        { operation: 'insert', table: 'audit', data: { user: apiResult.data, timestamp: Date.now() } },
        { ...mockContext, isServer: true }
      );
      
      // Verify the flow worked
      const state = await stateManagementTool.run(
        { action: 'get', key: 'currentUser' },
        mockContext
      );
      expect(state.value).toEqual(apiResult.data);
      expect(dbResult.operation).toBe('insert');
      expect(dbResult.data).toHaveProperty('user');
    });
  });
});