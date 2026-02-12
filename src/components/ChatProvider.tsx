'use client';

import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage, type ChatStatus } from 'ai';
import type { Tool } from '../tool';
import { createToolStateStore, type ToolStateStore } from './useToolStateStore';
import type { PersistenceAdapter, Thread } from '../persistence/types';

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
  toolStateStore: ToolStateStore;
  /** Approve and execute a HITL tool, then feed result back to AI */
  confirmTool: (toolCallId: string, toolName: string, toolInput: Record<string, unknown>) => Promise<void>;
  /** Reject a HITL tool and notify AI */
  rejectTool: (toolCallId: string, toolName: string) => Promise<void>;
  /** Retry a failed tool execution */
  retryTool: (toolCallId: string, toolName: string, toolInput: unknown) => void;
  /** Available threads (only when persistence is configured) */
  threads?: Thread[];
  /** Current thread ID */
  threadId?: string;
  /** Create a new thread (only when persistence is configured) */
  createThread?: (title?: string) => Promise<Thread>;
  /** Switch to a different thread (only when persistence is configured) */
  switchThread?: (threadId: string) => Promise<void>;
  /** Delete a thread (only when persistence is configured) */
  deleteThread?: (threadId: string) => Promise<void>;
}

export interface ChatProviderProps {
  endpoint?: string;
  tools: Record<string, Tool>;
  toolStateStore?: ToolStateStore;
  /** Persistence adapter for thread/message storage */
  persistence?: PersistenceAdapter;
  /** Active thread ID (used with persistence) */
  threadId?: string;
  children: React.ReactNode;
}

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

export function ChatProvider({ endpoint = '/api/chat', tools, toolStateStore: externalStore, persistence, threadId, children }: ChatProviderProps) {
  const transportRef = useRef(new DefaultChatTransport({ api: endpoint }));
  const { messages, setMessages, sendMessage, status, addToolOutput } = useChat({
    transport: transportRef.current,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Persistence: thread list
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(threadId);

  // Load thread list on mount when persistence is configured
  useEffect(() => {
    if (persistence) {
      persistence.listThreads().then(setThreads).catch((err) => console.warn('[better-ui] persistence error:', err));
    }
  }, [persistence]);

  // Load messages when threadId changes
  useEffect(() => {
    if (persistence && activeThreadId) {
      persistence.getMessages(activeThreadId).then((msgs) => {
        if (msgs.length > 0) {
          setMessages(msgs);
        }
      }).catch((err) => console.warn('[better-ui] persistence error:', err));
    }
  }, [persistence, activeThreadId, setMessages]);

  // Auto-save messages after AI finishes responding
  const prevStatusRef = useRef<ChatStatus>(status);
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted';
    const isNowReady = status === 'ready';
    prevStatusRef.current = status;

    if (persistence && activeThreadId && wasStreaming && isNowReady && messages.length > 0) {
      persistence.saveMessages(activeThreadId, messages).catch((err) => console.warn('[better-ui] persistence error:', err));
    }
  }, [status, persistence, activeThreadId, messages]);

  // Persistence thread management
  const createThreadFn = useCallback(async (title?: string) => {
    if (!persistence) throw new Error('Persistence not configured');
    const thread = await persistence.createThread(title);
    setThreads(prev => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setMessages([]);
    return thread;
  }, [persistence, setMessages]);

  const switchThreadFn = useCallback(async (id: string) => {
    if (!persistence) throw new Error('Persistence not configured');
    setActiveThreadId(id);
  }, [persistence]);

  const deleteThreadFn = useCallback(async (id: string) => {
    if (!persistence) throw new Error('Persistence not configured');
    await persistence.deleteThread(id);
    setThreads(prev => prev.filter(t => t.id !== id));
    if (activeThreadId === id) {
      setActiveThreadId(undefined);
      setMessages([]);
    }
  }, [persistence, activeThreadId, setMessages]);

  const internalStoreRef = useRef<ToolStateStore>(createToolStateStore());
  const toolStateStore = externalStore || internalStoreRef.current;

  const versionRef = useRef<Map<string, number>>(new Map());
  /** Track toolCallIds whose state was changed by user UI actions (dirty for AI sync) */
  const dirtyToolCallIdsRef = useRef<Set<string>>(new Set());

  /**
   * Build a state context object from dirty tool entries.
   * Returns null if no dirty state.
   */
  const collectDirtyState = useCallback((): Record<string, unknown> | null => {
    const dirty = dirtyToolCallIdsRef.current;
    if (dirty.size === 0) return null;

    const stateContext: Record<string, unknown> = {};
    for (const id of dirty) {
      const entry = toolStateStore.get(id);
      if (entry?.output && entry.toolName) {
        stateContext[entry.toolName] = entry.output;
      }
    }
    dirty.clear();
    return Object.keys(stateContext).length > 0 ? stateContext : null;
  }, [toolStateStore]);

  const executeToolDirect = useCallback(async (
    toolName: string,
    toolInput: Record<string, unknown>,
    toolCallId: string
  ) => {
    // Increment version for race guard
    const currentVersion = (versionRef.current.get(toolCallId) || 0) + 1;
    versionRef.current.set(toolCallId, currentVersion);

    // Set loading state in store
    const existing = toolStateStore.get(toolCallId);
    toolStateStore.set(toolCallId, {
      output: existing?.output ?? null,
      loading: true,
      error: null,
      version: currentVersion,
      toolName,
    });

    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, input: toolInput }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Tool execution failed (${response.status})`);
      }

      const { result } = await response.json();

      // Only apply if this is still the latest version
      if (versionRef.current.get(toolCallId) === currentVersion) {
        toolStateStore.set(toolCallId, {
          output: result,
          loading: false,
          error: null,
          version: currentVersion,
          toolName,
        });
        // Mark as dirty — user changed state via UI action
        dirtyToolCallIdsRef.current.add(toolCallId);

        // Auto-respond: if the tool has autoRespond, immediately send state to AI
        const toolDef = tools[toolName];
        if (toolDef?.autoRespond) {
          // Clear this tool from dirty set since we're sending it now
          dirtyToolCallIdsRef.current.delete(toolCallId);
          // Also collect any other dirty state
          const otherState = collectDirtyState();
          const stateContext = { ...otherState, [toolName]: result };
          const envelope = JSON.stringify({ text: '', stateContext, _meta: { hidden: true } });
          sendMessage({ text: envelope });
        }
      }
    } catch (error) {
      console.error('Tool execution error:', error);
      if (versionRef.current.get(toolCallId) === currentVersion) {
        toolStateStore.set(toolCallId, {
          output: existing?.output ?? null,
          loading: false,
          error: error instanceof Error ? error.message : 'Tool execution failed',
          version: currentVersion,
          toolName,
        });
      }
    }
  }, [toolStateStore, tools, sendMessage, collectDirtyState]);

  const confirmTool = useCallback(async (
    toolCallId: string,
    toolName: string,
    toolInput: Record<string, unknown>
  ) => {
    const currentVersion = (versionRef.current.get(toolCallId) || 0) + 1;
    versionRef.current.set(toolCallId, currentVersion);

    // Set loading + confirmed state
    toolStateStore.set(toolCallId, {
      output: null,
      loading: true,
      error: null,
      version: currentVersion,
      toolName,
      status: 'confirmed',
    });

    try {
      const response = await fetch('/api/tools/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, input: toolInput }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Tool execution failed (${response.status})`);
      }

      const { result } = await response.json();

      if (versionRef.current.get(toolCallId) === currentVersion) {
        toolStateStore.set(toolCallId, {
          output: result,
          loading: false,
          error: null,
          version: currentVersion,
          toolName,
          status: 'confirmed',
        });
      }

      // Feed result back to AI so conversation continues
      await addToolOutput({
        state: 'output-available',
        tool: toolName as any,
        toolCallId,
        output: result,
      });
    } catch (error) {
      console.error('HITL tool execution error:', error);
      if (versionRef.current.get(toolCallId) === currentVersion) {
        toolStateStore.set(toolCallId, {
          output: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Tool execution failed',
          version: currentVersion,
          toolName,
          status: 'confirmed',
        });
      }
    }
  }, [toolStateStore, addToolOutput]);

  const rejectTool = useCallback(async (
    toolCallId: string,
    toolName: string
  ) => {
    const currentVersion = (versionRef.current.get(toolCallId) || 0) + 1;
    versionRef.current.set(toolCallId, currentVersion);

    toolStateStore.set(toolCallId, {
      output: null,
      loading: false,
      error: null,
      version: currentVersion,
      toolName,
      status: 'rejected',
    });

    // Notify AI that user rejected
    await addToolOutput({
      state: 'output-error',
      tool: toolName as any,
      toolCallId,
      errorText: 'User rejected this action',
    });
  }, [toolStateStore, addToolOutput]);

  const retryTool = useCallback((toolCallId: string, toolName: string, toolInput: unknown) => {
    executeToolDirect(toolName, (toolInput ?? {}) as Record<string, unknown>, toolCallId);
  }, [executeToolDirect]);

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

  /**
   * Send a message with optional state context as a structured JSON envelope.
   *
   * Wire format (when state context is present):
   *   JSON.stringify({ text, stateContext, _meta: { hidden } })
   *
   * Plain text (no state context):
   *   Just the text string
   *
   * The server parses the envelope to inject stateContext into the prompt.
   * The Message component parses it to control display.
   */
  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const stateContext = collectDirtyState();
    if (stateContext) {
      const envelope = JSON.stringify({ text, stateContext, _meta: { hidden: false } });
      sendMessage({ text: envelope });
    } else {
      sendMessage({ text });
    }
  }, [sendMessage, collectDirtyState]);

  const value: ChatContextValue = {
    messages,
    sendMessage: handleSendMessage,
    isLoading,
    status,
    tools,
    executeToolDirect,
    getOnAction,
    toolStateStore,
    confirmTool,
    rejectTool,
    retryTool,
    ...(persistence ? {
      threads,
      threadId: activeThreadId,
      createThread: createThreadFn,
      switchThread: switchThreadFn,
      deleteThread: deleteThreadFn,
    } : {}),
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
