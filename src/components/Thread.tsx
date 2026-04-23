'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
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
          <div className="py-12">
            <p className="text-center text-sm text-[var(--bui-fg-secondary,#a1a1aa)]">
              {emptyMessage || 'Send a message to get started'}
            </p>
            {suggestions && suggestions.length > 0 && (
              <div className="mt-8 flex flex-col divide-y divide-[var(--bui-border,#27272a)] border-y border-[var(--bui-border,#27272a)]">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="group flex items-center justify-between gap-4 px-5 py-4 text-left text-sm text-[var(--bui-fg,#f4f4f5)] transition-colors hover:bg-[var(--bui-bg-hover,#27272a)]"
                  >
                    <span className="flex-1">{suggestion}</span>
                    <ArrowRight
                      size={14}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="shrink-0 text-[var(--bui-fg-faint,#52525b)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--bui-fg-secondary,#a1a1aa)]"
                    />
                  </button>
                ))}
              </div>
            )}
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
