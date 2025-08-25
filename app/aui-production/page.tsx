'use client';

import React, { useState } from 'react';
import { AUIProvider } from '@/lib/aui/provider';
import { useAUIToolEnhanced } from '@/lib/aui/hooks/useAUIToolEnhanced';
import {
  apiGatewayTool,
  stateManagerTool,
  analyticsTool,
  notificationTool,
  queryBuilderTool,
  websocketTool
} from '@/lib/aui/examples/production-tools';

function APIGatewayDemo() {
  const [endpoint, setEndpoint] = useState('https://api.github.com/users/vercel');
  const { execute, data, loading, error, executionCount } = useAUIToolEnhanced(apiGatewayTool, {
    cacheKey: (input) => input.endpoint,
    cacheDuration: 30000,
    retryCount: 3,
    onSuccess: (data) => console.log('API Success:', data),
    onError: (error) => console.error('API Error:', error)
  });

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">API Gateway with Caching & Retry</h3>
      <div className="space-y-4">
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="API Endpoint"
          className="w-full p-2 border rounded"
        />
        <button
          onClick={() => execute({
            endpoint,
            method: 'GET',
            cacheKey: endpoint,
            retries: 3
          })}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {loading ? 'Loading...' : 'Fetch Data'}
        </button>
        
        <div className="text-sm text-gray-600">
          Execution Count: {executionCount} (cached after first call)
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded">
            Error: {error.message}
          </div>
        )}
        
        {data && (
          <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-64">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function StateManagerDemo() {
  const [key, setKey] = useState('user');
  const [value, setValue] = useState('{"name": "John", "role": "admin"}');
  const { execute, data, loading } = useAUIToolEnhanced(stateManagerTool);

  const handleAction = async (action: string) => {
    try {
      const parsedValue = action !== 'get' && action !== 'delete' ? JSON.parse(value) : undefined;
      await execute({
        action: action as any,
        key,
        value: parsedValue,
        updates: action === 'update' ? parsedValue : undefined
      });
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">State Manager (Client-Side Store)</h3>
      <div className="space-y-4">
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="State Key"
          className="w-full p-2 border rounded"
        />
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="JSON Value"
          className="w-full p-2 border rounded h-24"
        />
        
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('get')}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
          >
            Get
          </button>
          <button
            onClick={() => handleAction('set')}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Set
          </button>
          <button
            onClick={() => handleAction('update')}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
          >
            Update
          </button>
          <button
            onClick={() => handleAction('delete')}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Delete
          </button>
          <button
            onClick={() => handleAction('clear')}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
          >
            Clear All
          </button>
        </div>
        
        {data && (
          <div className="p-3 bg-blue-50 rounded">
            <div className="font-semibold">Result:</div>
            <pre className="mt-2 text-sm">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsDemo() {
  const [eventName, setEventName] = useState('page_view');
  const [category, setCategory] = useState<'user' | 'system' | 'error' | 'performance'>('user');
  const { execute, data, executionCount } = useAUIToolEnhanced(analyticsTool);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Analytics Tracking (with Batching)</h3>
      <div className="space-y-4">
        <input
          type="text"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="Event Name"
          className="w-full p-2 border rounded"
        />
        
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          className="w-full p-2 border rounded"
        >
          <option value="user">User</option>
          <option value="system">System</option>
          <option value="error">Error</option>
          <option value="performance">Performance</option>
        </select>
        
        <button
          onClick={() => execute({
            event: eventName,
            category,
            properties: {
              page: window.location.pathname,
              timestamp: Date.now()
            }
          })}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Track Event
        </button>
        
        <div className="text-sm text-gray-600">
          Events Tracked: {executionCount}
        </div>
        
        {data && (
          <div className="p-3 bg-green-50 text-green-700 rounded">
            Event tracked: {data.event} ({data.category})
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationDemo() {
  const [title, setTitle] = useState('Hello!');
  const [message, setMessage] = useState('This is a notification');
  const [type, setType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const { execute, data } = useAUIToolEnhanced(notificationTool);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Notifications (Browser & In-App)</h3>
      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          className="w-full p-2 border rounded"
        />
        
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="w-full p-2 border rounded"
        >
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        
        <button
          onClick={() => execute({
            type,
            title,
            message,
            duration: 5000
          })}
          className="px-4 py-2 bg-indigo-500 text-white rounded"
        >
          Show Notification
        </button>
        
        {data && data.renderer && (
          <div className="mt-4">
            {notificationTool.renderer?.({ data, loading: false })}
          </div>
        )}
      </div>
    </div>
  );
}

function QueryBuilderDemo() {
  const [table, setTable] = useState('users');
  const [operation, setOperation] = useState<'select' | 'insert' | 'update' | 'delete'>('select');
  const { execute, data, loading } = useAUIToolEnhanced(queryBuilderTool);

  const handleExecute = () => {
    const query = {
      table,
      operation,
      columns: operation === 'select' ? ['id', 'name', 'email'] : undefined,
      where: operation !== 'insert' ? { id: 1 } : undefined,
      data: operation === 'insert' || operation === 'update' ? {
        name: 'John Doe',
        email: 'john@example.com'
      } : undefined,
      orderBy: operation === 'select' ? { column: 'name', direction: 'asc' as const } : undefined,
      limit: operation === 'select' ? 10 : undefined
    };
    
    execute(query);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">SQL Query Builder</h3>
      <div className="space-y-4">
        <input
          type="text"
          value={table}
          onChange={(e) => setTable(e.target.value)}
          placeholder="Table Name"
          className="w-full p-2 border rounded"
        />
        
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value as any)}
          className="w-full p-2 border rounded"
        >
          <option value="select">SELECT</option>
          <option value="insert">INSERT</option>
          <option value="update">UPDATE</option>
          <option value="delete">DELETE</option>
        </select>
        
        <button
          onClick={handleExecute}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
        >
          Build Query
        </button>
        
        {data && queryBuilderTool.renderer && (
          <div className="mt-4">
            {queryBuilderTool.renderer({ data, loading: false })}
          </div>
        )}
      </div>
    </div>
  );
}

function WebSocketDemo() {
  const [url, setUrl] = useState('wss://echo.websocket.org');
  const [message, setMessage] = useState('Hello WebSocket!');
  const [connected, setConnected] = useState(false);
  const { execute, data } = useAUIToolEnhanced(websocketTool);

  const handleConnect = async () => {
    const result = await execute({ action: 'connect', url });
    setConnected(true);
  };

  const handleSend = async () => {
    await execute({ action: 'send', message });
  };

  const handleDisconnect = async () => {
    await execute({ action: 'disconnect' });
    setConnected(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">WebSocket Communication</h3>
      <div className="space-y-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="WebSocket URL"
          className="w-full p-2 border rounded"
          disabled={connected}
        />
        
        <div className="flex gap-2">
          <button
            onClick={handleConnect}
            disabled={connected}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
          >
            Connect
          </button>
          <button
            onClick={handleDisconnect}
            disabled={!connected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
          >
            Disconnect
          </button>
        </div>
        
        {connected && (
          <>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message to send"
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Send Message
            </button>
          </>
        )}
        
        {data && (
          <div className="p-3 bg-gray-100 rounded">
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AUIProductionPage() {
  return (
    <AUIProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            AUI Production Examples
          </h1>
          
          <p className="text-lg text-gray-700 mb-8">
            Production-ready AUI tools with caching, retry logic, state management, and more.
            These examples demonstrate how AI can control both frontend and backend operations.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <APIGatewayDemo />
            <StateManagerDemo />
            <AnalyticsDemo />
            <NotificationDemo />
            <QueryBuilderDemo />
            <WebSocketDemo />
          </div>
          
          <div className="mt-12 p-6 bg-gray-800 text-white rounded-lg">
            <h2 className="text-2xl font-bold mb-4">How AI Uses These Tools</h2>
            <pre className="text-sm overflow-auto">
{`// AI can discover and execute tools
const tools = aui.getTools();

// Execute any tool by name
await aui.execute('api-gateway', {
  endpoint: '/api/data',
  method: 'GET',
  cacheKey: 'data'
});

// Manage application state
await aui.execute('state-manager', {
  action: 'set',
  key: 'user',
  value: { name: 'AI User' }
});

// Track analytics
await aui.execute('analytics', {
  event: 'ai_action',
  category: 'system',
  properties: { tool: 'api-gateway' }
});

// Show notifications
await aui.execute('notification', {
  type: 'success',
  title: 'Task Complete',
  message: 'AI has completed the requested operation'
});`}
            </pre>
          </div>
        </div>
      </div>
    </AUIProvider>
  );
}