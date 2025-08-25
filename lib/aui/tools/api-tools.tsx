import React from 'react';
import { z } from 'zod';
import { createAITool } from '../ai-control';

export const apiGet = createAITool('api.get')
  .describe('Make a GET request to an API endpoint')
  .tag('api', 'network', 'data')
  .input(z.object({
    url: z.string(),
    headers: z.record(z.string()).optional(),
    params: z.record(z.any()).optional()
  }))
  .execute(async ({ input, ctx }) => {
    const url = new URL(input.url);
    if (input.params) {
      Object.entries(input.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    const response = await ctx!.fetch(url.toString(), {
      method: 'GET',
      headers: input.headers
    });
    
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();
    
    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      <div>Status: {data.status} {data.statusText}</div>
      <pre className="bg-gray-100 p-2 rounded mt-2">
        {typeof data.data === 'object' 
          ? JSON.stringify(data.data, null, 2)
          : data.data}
      </pre>
    </div>
  ));

export const apiPost = createAITool('api.post')
  .describe('Make a POST request to an API endpoint')
  .tag('api', 'network', 'data')
  .input(z.object({
    url: z.string(),
    body: z.any(),
    headers: z.record(z.string()).optional(),
    json: z.boolean().optional().default(true)
  }))
  .execute(async ({ input, ctx }) => {
    const headers: HeadersInit = {
      ...input.headers
    };
    
    let body: any = input.body;
    if (input.json) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(input.body);
    }
    
    const response = await ctx!.fetch(input.url, {
      method: 'POST',
      headers,
      body
    });
    
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();
    
    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  });

export const apiPut = createAITool('api.put')
  .describe('Make a PUT request to an API endpoint')
  .tag('api', 'network', 'data')
  .input(z.object({
    url: z.string(),
    body: z.any(),
    headers: z.record(z.string()).optional()
  }))
  .execute(async ({ input, ctx }) => {
    const response = await ctx!.fetch(input.url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...input.headers
      },
      body: JSON.stringify(input.body)
    });
    
    const data = await response.json().catch(() => response.text());
    return {
      status: response.status,
      data
    };
  });

export const apiDelete = createAITool('api.delete')
  .describe('Make a DELETE request to an API endpoint')
  .tag('api', 'network', 'data')
  .input(z.object({
    url: z.string(),
    headers: z.record(z.string()).optional()
  }))
  .execute(async ({ input, ctx }) => {
    const response = await ctx!.fetch(input.url, {
      method: 'DELETE',
      headers: input.headers
    });
    
    return {
      status: response.status,
      success: response.ok
    };
  });

export const apiGraphQL = createAITool('api.graphql')
  .describe('Execute a GraphQL query or mutation')
  .tag('api', 'graphql', 'data')
  .input(z.object({
    endpoint: z.string(),
    query: z.string(),
    variables: z.record(z.any()).optional(),
    operationName: z.string().optional(),
    headers: z.record(z.string()).optional()
  }))
  .execute(async ({ input, ctx }) => {
    const response = await ctx!.fetch(input.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...input.headers
      },
      body: JSON.stringify({
        query: input.query,
        variables: input.variables,
        operationName: input.operationName
      })
    });
    
    const result = await response.json();
    return {
      data: result.data,
      errors: result.errors,
      status: response.status
    };
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.errors && (
        <div className="text-red-600">
          Errors: {JSON.stringify(data.errors)}
        </div>
      )}
      <pre className="bg-gray-100 p-2 rounded">
        {JSON.stringify(data.data, null, 2)}
      </pre>
    </div>
  ));

export const apiWebSocket = createAITool('api.websocket')
  .describe('Establish WebSocket connection')
  .tag('api', 'websocket', 'realtime')
  .input(z.object({
    url: z.string(),
    protocols: z.array(z.string()).optional()
  }))
  .clientExecute(async ({ input }) => {
    const ws = new WebSocket(input.url, input.protocols);
    
    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        resolve({
          connected: true,
          url: input.url,
          readyState: ws.readyState,
          send: (data: string) => ws.send(data),
          close: () => ws.close(),
          onMessage: (handler: (event: MessageEvent) => void) => {
            ws.onmessage = handler;
          }
        });
      };
      
      ws.onerror = (error) => {
        reject(new Error(`WebSocket connection failed: ${error}`));
      };
    });
  });

export const apiSSE = createAITool('api.sse')
  .describe('Connect to Server-Sent Events')
  .tag('api', 'sse', 'realtime')
  .input(z.object({
    url: z.string(),
    withCredentials: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    const eventSource = new EventSource(input.url, {
      withCredentials: input.withCredentials
    });
    
    return {
      connected: true,
      url: input.url,
      readyState: eventSource.readyState,
      onMessage: (handler: (event: MessageEvent) => void) => {
        eventSource.onmessage = handler;
      },
      onEvent: (event: string, handler: (event: MessageEvent) => void) => {
        eventSource.addEventListener(event, handler);
      },
      close: () => eventSource.close()
    };
  });