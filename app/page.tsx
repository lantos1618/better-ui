'use client';

import { useState } from 'react';
import { ChatProvider, Thread, Composer, ChatPanel, useChatContext, useChatToolOutput } from '@/src/components';
import { useToolEffect } from '@/src/components/useToolEffect';
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

function StandaloneStockTicker() {
  const [symbol, setSymbol] = useState('');
  const { tools: chatTools, executeToolDirect, getOnAction } = useChatContext();
  const { data, loading, error, toolCallId } = useChatToolOutput<{
    symbol: string;
    name: string;
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    dayHigh: number;
    dayLow: number;
    volume: number;
    currency: string;
  }>('stockQuote');

  const toolDef = chatTools.stockQuote;
  if (!toolDef) return null;

  const onAction = toolCallId ? getOnAction(toolCallId, 'stockQuote') : undefined;

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const ticker = symbol.trim().toUpperCase();
    if (!ticker) return;
    const id = `widget-stock-${Date.now()}`;
    executeToolDirect('stockQuote', { symbol: ticker }, id);
    setSymbol('');
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${data ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
          <span className="text-xs text-zinc-400 uppercase tracking-wider">Live Ticker</span>
        </div>
        <form onSubmit={handleLookup} className="flex items-center gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL"
            className="w-24 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 uppercase"
          />
          <button
            type="submit"
            disabled={!symbol.trim() || loading}
            className="px-3 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Look up
          </button>
        </form>
      </div>
      <div className="p-4">
        {data || loading ? (
          <toolDef.View
            data={data}
            loading={loading}
            onAction={onAction}
          />
        ) : (
          <p className="text-zinc-600 text-sm text-center py-4">
            Enter a ticker above or ask in chat
          </p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight">Better UI</h1>
        </div>

        {/* Two-column layout */}
        <ChatProvider endpoint="/api/chat" tools={tools}>
          <ChatWithEffects />
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Chat column */}
            <div className="flex-[3] min-w-0">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col h-[600px]">
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
              <ChatPanel className="h-[600px]" excludeTools={['stockQuote']} />
            </div>
          </div>

          {/* Standalone reactive widget */}
          <div className="mt-4">
            <p className="text-zinc-500 text-xs mb-2 uppercase tracking-wider">Standalone Reactive Widget</p>
            <StandaloneStockTicker />
          </div>
        </ChatProvider>

      </div>
    </div>
  );
}
