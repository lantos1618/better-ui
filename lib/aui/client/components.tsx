'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { ToolCall, ToolResult, ToolDefinition } from '../types';
import { ClientToolExecutor } from './executor';

interface ToolRendererProps {
  toolCall: ToolCall;
  tool: ToolDefinition;
  executor?: ClientToolExecutor;
  onResult?: (result: ToolResult) => void;
}

export function ToolRenderer({ 
  toolCall, 
  tool, 
  executor: providedExecutor,
  onResult 
}: ToolRendererProps) {
  const [result, setResult] = useState<ToolResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const executor = useMemo(() => {
    return providedExecutor || new ClientToolExecutor();
  }, [providedExecutor]);

  useEffect(() => {
    const executeToolCall = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await executor.execute(toolCall);
        setResult(res);
        
        if (res.error) {
          setError(res.error);
        }
        
        onResult?.(res);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setResult({
          id: toolCall.id,
          toolName: toolCall.toolName,
          output: null,
          error: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    };

    executeToolCall();
  }, [toolCall, executor, onResult]);

  if (loading) {
    return (
      <div className="aui-tool-loading">
        <span>Executing {tool.name}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aui-tool-error">
        <span>Error: {error}</span>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  if (tool.render) {
    return tool.render({ 
      data: result.output, 
      input: toolCall.input 
    });
  }

  return (
    <div className="aui-tool-result">
      <pre>{JSON.stringify(result.output, null, 2)}</pre>
    </div>
  );
}

interface ToolExecutorProviderProps {
  children: React.ReactNode;
  executor?: ClientToolExecutor;
  tools?: ToolDefinition[];
}

const ToolExecutorContext = React.createContext<ClientToolExecutor | null>(null);

export function ToolExecutorProvider({ 
  children, 
  executor: providedExecutor,
  tools = []
}: ToolExecutorProviderProps) {
  const executor = useMemo(() => {
    const exec = providedExecutor || new ClientToolExecutor();
    tools.forEach(tool => exec.registerTool(tool));
    return exec;
  }, [providedExecutor, tools]);

  return (
    <ToolExecutorContext.Provider value={executor}>
      {children}
    </ToolExecutorContext.Provider>
  );
}

export function useToolExecutor() {
  const executor = React.useContext(ToolExecutorContext);
  if (!executor) {
    throw new Error('useToolExecutor must be used within ToolExecutorProvider');
  }
  return executor;
}

export function useToolExecution(toolCall: ToolCall) {
  const executor = useToolExecutor();
  const [result, setResult] = useState<ToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await executor.execute(toolCall);
      setResult(res);
      
      if (res.error) {
        setError(res.error);
      }
      
      return res;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [executor, toolCall]);

  return {
    execute,
    result,
    loading,
    error,
  };
}