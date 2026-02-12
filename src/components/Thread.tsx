'use client';

import React, { useRef, useEffect } from 'react';
import { useChatContext } from './ChatProvider';
import { Message } from './Message';

export interface ThreadProps {
  className?: string;
  emptyMessage?: string;
  suggestions?: string[];
}

/**
 * Message list with auto-scroll.
 * Renders messages from ChatContext, maps over messages, renders text parts and tool parts.
 */
export function Thread({ className, emptyMessage, suggestions }: ThreadProps) {
  const { messages, isLoading, sendMessage, tools, toolStateStore, getOnAction, confirmTool, rejectTool, retryTool } = useChatContext();
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
            <div className="text-[var(--bui-fg-faint,#52525b)] text-sm">
              <p className="text-[var(--bui-fg-secondary,#a1a1aa)] mb-4">
                {emptyMessage || 'Send a message to get started'}
              </p>
              {suggestions && suggestions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="px-3 py-1.5 text-xs text-[var(--bui-fg-secondary,#a1a1aa)] bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-full hover:bg-[var(--bui-bg-hover,#3f3f46)] hover:text-[var(--bui-fg,#f4f4f5)] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {messages.map((message, i) => (
          <Message
            key={`${message.id}-${i}`}
            message={message}
            tools={tools}
            toolStateStore={toolStateStore}
            getOnAction={getOnAction}
            onConfirm={confirmTool}
            onReject={rejectTool}
            onRetry={retryTool}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-[var(--bui-fg-muted,#71717a)] text-sm">
            <div className="w-1.5 h-1.5 bg-[var(--bui-fg-muted,#71717a)] rounded-full animate-pulse" />
            <span>Thinking</span>
          </div>
        )}
      </div>
    </div>
  );
}
