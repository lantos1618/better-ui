'use client';

import { Chat } from '@/src/components';
import { tools } from '@/lib/tools';

export default function ChatDemo() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight">Better UI</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Tools defined once, used everywhere
          </p>
        </div>

        {/* Chat */}
        <Chat
          endpoint="/api/chat"
          tools={tools}
          className="min-h-[480px] max-h-[600px]"
          emptyMessage="Try something like:"
          placeholder="Ask something..."
        />

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-8">
          Define tools once with .server() and .view() &mdash; use everywhere
        </p>
      </div>
    </div>
  );
}
