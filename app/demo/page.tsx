'use client';

import { ChatProvider, Thread, Composer, ChatPanel, useChatContext } from '@/src/components';
import { useToolEffect } from '@/src/components/useToolEffect';
import { tools } from '@/lib/tools';

const suggestions = [
  "What's the weather in Tokyo?",
  "Create a counter called score",
  "Search for React hooks",
  "Write a fibonacci function",
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

export default function ChatDemo() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight">Better UI</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Tools defined once, used everywhere
          </p>
        </div>

        {/* Two-column layout */}
        <ChatProvider endpoint="/api/chat" tools={tools}>
          <ChatWithEffects />
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Chat column */}
            <div className="flex-[3] min-w-0">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col min-h-[480px] max-h-[600px]">
                <Thread
                  className="flex-1 overflow-y-auto"
                  emptyMessage="Try something like:"
                  suggestions={suggestions}
                />
                <div className="p-4 pt-0">
                  <Composer placeholder="Ask something..." />
                </div>
              </div>
            </div>

            {/* Panel column */}
            <div className="flex-[2] min-w-0">
              <ChatPanel className="min-h-[480px] max-h-[600px]" />
            </div>
          </div>
        </ChatProvider>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-8">
          Define tools once with .server() and .view() &mdash; use everywhere
        </p>
      </div>
    </div>
  );
}
