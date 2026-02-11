'use client';

import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage, type ChatStatus } from 'ai';
import type { Tool } from '../tool';

// ============================================
// Types
// ============================================

/** Parsed tool part from a UIMessage */
export interface ToolPartInfo {
  toolName: string;
  toolCallId: string;
  state: string;
  output: unknown;
}

interface ChatContextValue {
  messages: UIMessage[];
  sendMessage: (text: string) => void;
  isLoading: boolean;
  status: ChatStatus;
  tools: Record<string, Tool>;
  executeToolDirect: (toolName: string, toolInput: Record<string, unknown>, toolCallId: string) => Promise<void>;
  getOnAction: (toolCallId: string, toolName: string) => (input: Record<string, unknown>) => void;
  loadingTools: Record<string, boolean>;
}

export interface ChatProviderProps {
  endpoint?: string;
  tools: Record<string, Tool>;
  children: React.ReactNode;
}

// ============================================
// Context
// ============================================

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Hook to access chat context. Must be used within a ChatProvider.
 */
export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a <ChatProvider>');
  }
  return ctx;
}

// ============================================
// Provider
// ============================================

export function ChatProvider({ endpoint = '/api/chat', tools, children }: ChatProviderProps) {
  const transportRef = useRef(new DefaultChatTransport({ api: endpoint }));
  const { messages, sendMessage, status, addToolOutput } = useChat({
    transport: transportRef.current,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const [loadingTools, setLoadingTools] = useState<Record<string, boolean>>({});

  const executeToolDirect = useCallback(async (
    toolName: string,
    toolInput: Record<string, unknown>,
    toolCallId: string
  ) => {
    setLoadingTools(prev => ({ ...prev, [toolCallId]: true }));

    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, input: toolInput }),
      });

      if (!response.ok) throw new Error('Tool execution failed');

      const { result } = await response.json();

      addToolOutput({ tool: toolName, toolCallId, output: result });
    } catch (error) {
      console.error('Tool execution error:', error);
    } finally {
      setLoadingTools(prev => {
        const next = { ...prev };
        delete next[toolCallId];
        return next;
      });
    }
  }, [addToolOutput]);

  const callbackCacheRef = useRef<Map<string, (input: Record<string, unknown>) => void>>(new Map());

  const getOnAction = useCallback((toolCallId: string, toolName: string) => {
    const key = `${toolName}:${toolCallId}`;
    let cb = callbackCacheRef.current.get(key);
    if (!cb) {
      cb = (input: Record<string, unknown>) => {
        executeToolDirect(toolName, input, toolCallId);
      };
      callbackCacheRef.current.set(key, cb);
    }
    return cb;
  }, [executeToolDirect]);

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    sendMessage({ text });
  }, [sendMessage]);

  const value: ChatContextValue = {
    messages,
    sendMessage: handleSendMessage,
    isLoading,
    status,
    tools,
    executeToolDirect,
    getOnAction,
    loadingTools,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
