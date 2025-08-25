import { z } from 'zod';
import { createAITool, AIControlledTool } from './ai-control';
import { AUIContext } from './core';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ServerControlContext extends AUIContext {
  req?: NextRequest;
  res?: NextResponse;
  db?: any;
  redis?: any;
  prisma?: any;
}

export const serverTools = {
  fileOperations: createAITool('server-file-ops', {
    permissions: {
      allowServerExecution: true,
      allowFileSystemAccess: true
    },
    audit: true,
    sandbox: true
  })
    .input(z.object({
      operation: z.enum(['read', 'write', 'append', 'delete', 'exists', 'mkdir', 'list']),
      path: z.string(),
      content: z.string().optional(),
      encoding: z.enum(['utf8', 'base64', 'binary']).default('utf8').optional()
    }))
    .describe('Perform file system operations on the server')
    .tag('server', 'filesystem', 'io')
    .execute(async ({ input }) => {
      const safePath = path.resolve(process.cwd(), input.path);
      
      if (!safePath.startsWith(process.cwd())) {
        throw new Error('Path traversal attempt blocked');
      }

      switch (input.operation) {
        case 'read':
          const content = await fs.readFile(safePath, input.encoding || 'utf8');
          return { content, path: safePath };
        
        case 'write':
          if (!input.content) throw new Error('Content required for write operation');
          await fs.writeFile(safePath, input.content, input.encoding || 'utf8');
          return { success: true, path: safePath };
        
        case 'append':
          if (!input.content) throw new Error('Content required for append operation');
          await fs.appendFile(safePath, input.content, input.encoding || 'utf8');
          return { success: true, path: safePath };
        
        case 'delete':
          await fs.unlink(safePath);
          return { success: true, deleted: safePath };
        
        case 'exists':
          const exists = await fs.access(safePath).then(() => true).catch(() => false);
          return { exists, path: safePath };
        
        case 'mkdir':
          await fs.mkdir(safePath, { recursive: true });
          return { success: true, created: safePath };
        
        case 'list':
          const items = await fs.readdir(safePath, { withFileTypes: true });
          return {
            path: safePath,
            items: items.map(item => ({
              name: item.name,
              type: item.isDirectory() ? 'directory' : 'file'
            }))
          };
        
        default:
          throw new Error('Unknown operation');
      }
    }),

  processExecution: createAITool('server-process', {
    permissions: {
      allowServerExecution: true
    },
    audit: true,
    sandbox: true,
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100
    }
  })
    .input(z.object({
      command: z.string(),
      args: z.array(z.string()).optional(),
      cwd: z.string().optional(),
      env: z.record(z.string()).optional(),
      timeout: z.number().default(30000).optional()
    }))
    .describe('Execute system commands on the server')
    .tag('server', 'process', 'system')
    .execute(async ({ input }) => {
      const allowedCommands = ['ls', 'pwd', 'echo', 'node', 'npm', 'yarn', 'pnpm'];
      const cmd = input.command.split(' ')[0];
      
      if (!allowedCommands.includes(cmd)) {
        throw new Error(`Command "${cmd}" is not allowed`);
      }

      const fullCommand = input.args 
        ? `${input.command} ${input.args.join(' ')}`
        : input.command;

      try {
        const { stdout, stderr } = await execAsync(fullCommand, {
          cwd: input.cwd || process.cwd(),
          env: { ...process.env, ...input.env },
          timeout: input.timeout
        });

        return {
          stdout,
          stderr,
          exitCode: 0,
          command: fullCommand
        };
      } catch (error: any) {
        return {
          stdout: error.stdout || '',
          stderr: error.stderr || error.message,
          exitCode: error.code || 1,
          command: fullCommand,
          error: error.message
        };
      }
    }),

  databaseQuery: createAITool('server-database', {
    permissions: {
      allowServerExecution: true,
      allowDatabaseAccess: true
    },
    audit: true,
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerHour: 1000
    }
  })
    .input(z.object({
      operation: z.enum(['find', 'findOne', 'create', 'update', 'delete', 'count', 'aggregate']),
      model: z.string(),
      where: z.record(z.any()).optional(),
      data: z.record(z.any()).optional(),
      select: z.record(z.boolean()).optional(),
      include: z.record(z.any()).optional(),
      orderBy: z.record(z.enum(['asc', 'desc'])).optional(),
      take: z.number().optional(),
      skip: z.number().optional()
    }))
    .describe('Execute database operations via Prisma or other ORMs')
    .tag('server', 'database', 'orm')
    .execute(async ({ input, ctx }) => {
      const serverCtx = ctx as ServerControlContext;
      
      if (!serverCtx.prisma) {
        throw new Error('Database connection not available');
      }

      const model = serverCtx.prisma[input.model];
      if (!model) {
        throw new Error(`Model "${input.model}" not found`);
      }

      const query: any = {};
      if (input.where) query.where = input.where;
      if (input.data) query.data = input.data;
      if (input.select) query.select = input.select;
      if (input.include) query.include = input.include;
      if (input.orderBy) query.orderBy = input.orderBy;
      if (input.take) query.take = input.take;
      if (input.skip) query.skip = input.skip;

      const result = await model[input.operation](query);
      
      return {
        operation: input.operation,
        model: input.model,
        result,
        count: Array.isArray(result) ? result.length : 1
      };
    }),

  cacheControl: createAITool('server-cache', {
    permissions: {
      allowServerExecution: true
    },
    audit: true
  })
    .input(z.object({
      operation: z.enum(['get', 'set', 'delete', 'clear', 'has']),
      key: z.string(),
      value: z.any().optional(),
      ttl: z.number().optional()
    }))
    .describe('Control server-side caching')
    .tag('server', 'cache', 'performance')
    .execute(async ({ input, ctx }) => {
      const serverCtx = ctx as ServerControlContext;
      const cache = serverCtx.cache || new Map();

      switch (input.operation) {
        case 'get':
          return { value: cache.get(input.key), key: input.key };
        
        case 'set':
          cache.set(input.key, input.value);
          if (input.ttl) {
            setTimeout(() => cache.delete(input.key), input.ttl * 1000);
          }
          return { success: true, key: input.key };
        
        case 'delete':
          const deleted = cache.delete(input.key);
          return { success: deleted, key: input.key };
        
        case 'clear':
          cache.clear();
          return { success: true, cleared: true };
        
        case 'has':
          return { exists: cache.has(input.key), key: input.key };
        
        default:
          throw new Error('Unknown cache operation');
      }
    }),

  apiRoute: createAITool('server-api-route', {
    permissions: {
      allowServerExecution: true,
      allowNetworkRequests: true
    },
    audit: true
  })
    .input(z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
      path: z.string(),
      headers: z.record(z.string()).optional(),
      body: z.any().optional(),
      query: z.record(z.string()).optional()
    }))
    .describe('Create or modify API routes')
    .tag('server', 'api', 'routing')
    .execute(async ({ input }) => {
      return {
        method: input.method,
        path: input.path,
        status: 200,
        response: {
          message: 'Route handler executed',
          data: input.body
        }
      };
    }),

  environmentControl: createAITool('server-env', {
    permissions: {
      allowServerExecution: true
    },
    audit: true
  })
    .input(z.object({
      operation: z.enum(['get', 'set', 'list']),
      key: z.string().optional(),
      value: z.string().optional()
    }))
    .describe('Manage environment variables')
    .tag('server', 'environment', 'config')
    .execute(async ({ input }) => {
      switch (input.operation) {
        case 'get':
          if (!input.key) throw new Error('Key required for get operation');
          return { key: input.key, value: process.env[input.key] };
        
        case 'set':
          if (!input.key || !input.value) {
            throw new Error('Key and value required for set operation');
          }
          process.env[input.key] = input.value;
          return { success: true, key: input.key };
        
        case 'list':
          const safeKeys = Object.keys(process.env).filter(
            key => !key.includes('SECRET') && !key.includes('KEY') && !key.includes('TOKEN')
          );
          return { 
            keys: safeKeys,
            count: safeKeys.length 
          };
        
        default:
          throw new Error('Unknown environment operation');
      }
    }),

  logAnalysis: createAITool('server-logs', {
    permissions: {
      allowServerExecution: true,
      allowFileSystemAccess: true
    },
    audit: true
  })
    .input(z.object({
      source: z.enum(['console', 'file', 'database']),
      level: z.enum(['error', 'warn', 'info', 'debug']).optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      limit: z.number().default(100).optional(),
      filter: z.string().optional()
    }))
    .describe('Analyze and retrieve server logs')
    .tag('server', 'logging', 'monitoring')
    .execute(async ({ input }) => {
      return {
        source: input.source,
        logs: [],
        count: 0,
        timeRange: {
          start: input.startTime,
          end: input.endTime
        }
      };
    })
};

export function createServerControlSystem() {
  const tools = new Map<string, AIControlledTool>();
  
  Object.values(serverTools).forEach(tool => {
    tools.set(tool.name, tool);
  });

  return {
    tools,
    
    async executeServerTool(
      name: string, 
      input: any, 
      context?: ServerControlContext
    ) {
      const tool = tools.get(name);
      if (!tool) {
        throw new Error(`Server tool "${name}" not found`);
      }
      
      const serverContext: ServerControlContext = {
        ...context,
        isServer: true,
        cache: context?.cache || new Map(),
        fetch: fetch
      };
      
      return await tool.run(input, serverContext);
    },
    
    registerServerTool(tool: AIControlledTool) {
      tools.set(tool.name, tool);
      return this;
    },
    
    listServerTools() {
      return Array.from(tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        tags: tool.tags,
        schema: tool.schema
      }));
    }
  };
}

export const serverControlSystem = createServerControlSystem();