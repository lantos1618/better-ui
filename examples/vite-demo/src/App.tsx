import { ChatProvider, Thread, Composer, ChatPanel, useChatContext, useToolEffect } from '@lantos1618/better-ui/components';
import { tools } from '@/lib/tools';

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

export default function App() {
  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <ChatProvider endpoint="/api/chat" tools={tools}>
        <ChatWithEffects />
        <div className="flex flex-1 min-h-0">
          {/* Chat — left */}
          <div className="w-[420px] shrink-0 border-r border-zinc-800 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h1 className="text-sm font-medium tracking-tight text-zinc-300">Better UI (Vite)</h1>
            </div>
            <Thread
              className="flex-1 overflow-y-auto"
              emptyMessage="Try something like:"
              suggestions={suggestions}
            />
            <div className="p-3 border-t border-zinc-800">
              <Composer placeholder="Ask something..." />
            </div>
          </div>

          {/* Canvas — right */}
          <div className="flex-1 min-w-0">
            <ChatPanel className="h-full" />
          </div>
        </div>
      </ChatProvider>
    </div>
  );
}
