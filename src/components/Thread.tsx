'use client';

import React, { useRef, useEffect } from 'react';
import { useChatContext } from './ChatProvider';
import { Message } from './Message';

export interface ThreadProps {
  className?: string;
  emptyMessage?: string;
}

/**
 * Message list with auto-scroll.
 * Renders messages from ChatContext, maps over messages, renders text parts and tool parts.
 */
export function Thread({ className, emptyMessage }: ThreadProps) {
  const { messages, isLoading, tools, loadingTools, getOnAction } = useChatContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className={`${className || ''}`}>
      <div className="p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="text-zinc-600 text-sm">
              <p className="text-zinc-400 mb-4">
                {emptyMessage || 'Send a message to get started'}
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            tools={tools}
            loadingTools={loadingTools}
            getOnAction={getOnAction}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
            <span>Thinking</span>
          </div>
        )}
      </div>
    </div>
  );
}
