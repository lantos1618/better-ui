'use client';

import React from 'react';
import type { Tool } from '../tool';
import { ChatProvider } from './ChatProvider';
import { Thread } from './Thread';
import { Composer } from './Composer';

export interface ChatProps {
  endpoint?: string;
  tools: Record<string, Tool>;
  className?: string;
  placeholder?: string;
  emptyMessage?: string;
}

/**
 * Convenience all-in-one chat component.
 * Combines ChatProvider + Thread + Composer into a single drop-in component.
 */
export function Chat({
  endpoint = '/api/chat',
  tools,
  className,
  placeholder,
  emptyMessage,
}: ChatProps) {
  return (
    <ChatProvider endpoint={endpoint} tools={tools}>
      <div className={`bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col ${className || ''}`}>
        <Thread
          className="flex-1 overflow-y-auto"
          emptyMessage={emptyMessage}
        />
        <div className="p-4 pt-0">
          <Composer placeholder={placeholder} />
        </div>
      </div>
    </ChatProvider>
  );
}
