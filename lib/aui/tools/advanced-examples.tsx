import React from 'react';
import aui, { z } from '../index';

export const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    switch (input.operation) {
      case 'create':
        return { id: Date.now(), ...input.data };
      case 'read':
        return { records: [], count: 0 };
      case 'update':
        return { updated: 1 };
      case 'delete':
        return { deleted: 1 };
    }
  });

export const fileSystemTool = aui
  .tool('fileSystem')
  .input(z.object({
    action: z.enum(['read', 'write', 'list']),
    path: z.string(),
    content: z.string().optional()
  }))
  .execute(async ({ input }) => {
    return { success: true, action: input.action, path: input.path };
  });

export const apiTool = aui
  .tool('api')
  .input(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    endpoint: z.string(),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    return { status: 200, data: { message: 'Success' } };
  });

export const processTool = aui
  .tool('process')
  .input(z.object({
    command: z.string(),
    args: z.array(z.string()).optional()
  }))
  .execute(async ({ input }) => {
    return { output: `Executed: ${input.command}`, exitCode: 0 };
  });

export const stateTool = aui
  .tool('state')
  .input(z.object({
    action: z.enum(['get', 'set', 'update']),
    key: z.string(),
    value: z.any().optional()
  }))
  .execute(async ({ input }) => {
    return { key: input.key, value: input.value || null };
  });

export const notificationTool = aui
  .tool('notification')
  .input(z.object({
    type: z.enum(['info', 'success', 'warning', 'error']),
    message: z.string(),
    duration: z.number().optional()
  }))
  .execute(async ({ input }) => {
    return { sent: true, ...input };
  })
  .render(({ data }) => (
    <div className={`p-4 rounded-lg ${
      data.type === 'error' ? 'bg-red-100' :
      data.type === 'warning' ? 'bg-yellow-100' :
      data.type === 'success' ? 'bg-green-100' :
      'bg-blue-100'
    }`}>
      {data.message}
    </div>
  ));