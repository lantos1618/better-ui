'use client';

import React, { useState, useEffect } from 'react';
import type { ToolCall, ToolResult } from '../types/index';

interface AUIVisualizerProps {
  showTools?: boolean;
  showExecution?: boolean;
  showCache?: boolean;
}

interface ExecutionLog {
  id: string;
  timestamp: Date;
  type: 'call' | 'result' | 'error';
  toolName: string;
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
}

export function AUIVisualizer({ 
  showTools = true, 
  showExecution = true,
  showCache = true 
}: AUIVisualizerProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, size: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Fetch available tools
    if (showTools) {
      fetch('/api/aui')
        .then(res => res.json())
        .then(data => setTools(data.tools || []));
    }

    // Set up execution monitoring
    if (showExecution) {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const start = Date.now();
        const url = args[0] as string;
        
        if (url.includes('/api/aui')) {
          const body = args[1]?.body ? JSON.parse(args[1].body as string) : {};
          const toolCall = body.toolCall;
          
          if (toolCall) {
            const callLog: ExecutionLog = {
              id: toolCall.id,
              timestamp: new Date(),
              type: 'call',
              toolName: toolCall.toolName,
              input: toolCall.input,
            };
            setLogs(prev => [...prev.slice(-9), callLog]);
          }
        }
        
        try {
          const response = await originalFetch(...args);
          const duration = Date.now() - start;
          
          if (url.includes('/api/aui')) {
            const data = await response.clone().json();
            if (data.id) {
              const resultLog: ExecutionLog = {
                id: data.id,
                timestamp: new Date(),
                type: data.error ? 'error' : 'result',
                toolName: data.toolName,
                output: data.output,
                error: data.error,
                duration,
              };
              setLogs(prev => [...prev.slice(-9), resultLog]);
            }
          }
          
          return response;
        } catch (error) {
          const errorLog: ExecutionLog = {
            id: Date.now().toString(),
            timestamp: new Date(),
            type: 'error',
            toolName: 'fetch',
            error: error instanceof Error ? error.message : String(error),
            duration: Date.now() - start,
          };
          setLogs(prev => [...prev.slice(-9), errorLog]);
          throw error;
        }
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [showTools, showExecution]);

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
      >
        🔍 AUI Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-white border border-gray-300 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-2 flex justify-between items-center">
        <h3 className="font-bold">AUI Visualizer</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-white hover:bg-purple-700 px-2 py-1 rounded"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {showExecution && (
          <button
            className="flex-1 px-4 py-2 text-sm font-medium hover:bg-gray-50 border-r"
            onClick={() => {}}
          >
            Execution ({logs.length})
          </button>
        )}
        {showTools && (
          <button
            className="flex-1 px-4 py-2 text-sm font-medium hover:bg-gray-50 border-r"
            onClick={() => {}}
          >
            Tools ({tools.length})
          </button>
        )}
        {showCache && (
          <button
            className="flex-1 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            onClick={() => {}}
          >
            Cache
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {showExecution && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Recent Executions</h4>
            {logs.length === 0 ? (
              <p className="text-gray-400 text-sm">No executions yet</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={`${log.id}-${index}`}
                  className={`p-2 rounded text-xs border ${
                    log.type === 'error' 
                      ? 'bg-red-50 border-red-200' 
                      : log.type === 'call'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono font-semibold">
                      {log.type === 'call' ? '→' : log.type === 'error' ? '✗' : '←'} {log.toolName}
                    </span>
                    <span className="text-gray-500">
                      {formatTimestamp(log.timestamp)}
                      {log.duration && ` (${formatDuration(log.duration)})`}
                    </span>
                  </div>
                  
                  {log.input && (
                    <div className="mt-1">
                      <span className="text-gray-600">Input:</span>
                      <pre className="bg-white bg-opacity-50 p-1 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.input, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {log.output && (
                    <div className="mt-1">
                      <span className="text-gray-600">Output:</span>
                      <pre className="bg-white bg-opacity-50 p-1 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.output, null, 2).substring(0, 200)}
                        {JSON.stringify(log.output).length > 200 && '...'}
                      </pre>
                    </div>
                  )}
                  
                  {log.error && (
                    <div className="mt-1 text-red-600">
                      Error: {log.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {showTools && tools.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Available Tools</h4>
            {tools.map((tool) => (
              <div key={tool.name} className="p-2 bg-gray-50 rounded text-xs">
                <div className="font-mono font-semibold">{tool.name}</div>
                {tool.description && (
                  <div className="text-gray-600 mt-1">{tool.description}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {showCache && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Cache Statistics</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-green-50 p-2 rounded text-center">
                <div className="font-semibold text-green-600">{cacheStats.hits}</div>
                <div className="text-gray-600">Hits</div>
              </div>
              <div className="bg-red-50 p-2 rounded text-center">
                <div className="font-semibold text-red-600">{cacheStats.misses}</div>
                <div className="text-gray-600">Misses</div>
              </div>
              <div className="bg-blue-50 p-2 rounded text-center">
                <div className="font-semibold text-blue-600">{cacheStats.size}</div>
                <div className="text-gray-600">Entries</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-2 bg-gray-50">
        <button
          onClick={() => setLogs([])}
          className="text-xs text-gray-600 hover:text-gray-800"
        >
          Clear Logs
        </button>
      </div>
    </div>
  );
}

// Development-only auto-inject
if (process.env.NODE_ENV === 'development') {
  if (typeof window !== 'undefined') {
    const injectVisualizer = () => {
      const root = document.getElementById('__next') || document.body;
      const container = document.createElement('div');
      container.id = 'aui-visualizer';
      root.appendChild(container);
      
      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(container);
        root.render(<AUIVisualizer />);
      });
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectVisualizer);
    } else {
      injectVisualizer();
    }
  }
}