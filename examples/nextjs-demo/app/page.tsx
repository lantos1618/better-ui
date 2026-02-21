'use client';

import { useState, useMemo, useEffect, useRef, useSyncExternalStore, useCallback } from 'react';
import { ChatProvider, Thread, Composer, ChatPanel, useChatContext, useToolEffect } from '@lantos1618/better-ui/components';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { tools } from '@/lib/tools';
import { createFetchPersistence } from '@/lib/persistence';

const suggestions = [
  "What's the weather in Tokyo?",
  "What's TSLA stock price?",
  "Create a counter called score",
  "Search for React hooks",
  "Send an email to alice@example.com",
];

function ChatWithEffects() {
  const { toolStateStore } = useChatContext();

  useToolEffect(toolStateStore, 'navigate', (entry) => {
    const data = entry.output as { url: string };
    if (data?.url) window.open(data.url, '_blank');
  });

  useToolEffect(toolStateStore, 'setTheme', (entry) => {
    const data = entry.output as { theme: string };
    if (data?.theme) {
      document.documentElement.classList.toggle('dark', data.theme === 'dark');
    }
  });

  return null;
}

/** Auto-select or create a thread on mount so messages always persist. */
function ThreadInit() {
  const { threads, threadId, createThread, switchThread } = useChatContext();
  const initializedRef = useRef(false);
  const [ready, setReady] = useState(false);

  // Wait a tick for ChatProvider's listThreads() to resolve
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || initializedRef.current || threadId) return;
    initializedRef.current = true;
    if (threads && threads.length > 0) {
      switchThread?.(threads[0].id);
    } else {
      createThread?.();
    }
  }, [ready, threads, threadId, createThread, switchThread]);

  return null;
}

/** Returns true when the canvas has at least one tool result to show. */
function useHasCanvasContent() {
  const { toolStateStore } = useChatContext();
  const subscribe = useCallback(
    (listener: () => void) => toolStateStore.subscribeAll(listener),
    [toolStateStore]
  );
  const getSnapshot = useCallback(() => {
    const snap = toolStateStore.getSnapshot();
    for (const [, entry] of snap) {
      if (entry.output != null || entry.loading) return true;
    }
    return false;
  }, [toolStateStore]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function ThreadSidebar() {
  const { threads, threadId, createThread, switchThread, deleteThread } = useChatContext();

  if (!threads) return null;

  return (
    <div className="w-56 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <h1 className="text-sm font-medium tracking-tight text-zinc-300">Better UI</h1>
        <button
          onClick={() => createThread?.()}
          className="w-full px-3 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {threads.map((t) => (
          <div
            key={t.id}
            className={`group flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
              t.id === threadId ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
            onClick={() => switchThread?.(t.id)}
          >
            <span className="flex-1 truncate">{t.title || 'Untitled'}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteThread?.(t.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatLayout() {
  const hasCanvas = useHasCanvasContent();

  return (
    <Group className="flex-1">
      {/* Chat */}
      <Panel defaultSize={hasCanvas ? 35 : 100} minSize={20}>
        <div className="h-full flex flex-col border-r border-zinc-800">
          <Thread
            className="flex-1 overflow-y-auto"
            emptyMessage="Try something like:"
            suggestions={suggestions}
          />
          <div className="p-3 border-t border-zinc-800">
            <Composer placeholder="Ask something..." />
          </div>
        </div>
      </Panel>

      {hasCanvas && (
        <>
          <Separator className="w-1.5 bg-zinc-900 hover:bg-zinc-700 transition-colors cursor-col-resize" />
          <Panel defaultSize={65} minSize={20}>
            <ChatPanel className="h-full" />
          </Panel>
        </>
      )}
    </Group>
  );
}

export default function Home() {
  const persistence = useMemo(() => createFetchPersistence(), []);
  const [threadId, setThreadId] = useState<string>();

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <ChatProvider endpoint="/api/chat" tools={tools} persistence={persistence} threadId={threadId}>
        <ChatWithEffects />
        <ThreadInit />
        <div className="flex flex-1 min-h-0">
          {/* Thread sidebar */}
          <ThreadSidebar />

          <ChatLayout />
        </div>
      </ChatProvider>
    </div>
  );
}
