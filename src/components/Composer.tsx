'use client';

import React, { useState } from 'react';
import { useChatContext } from './ChatProvider';

export interface ComposerProps {
  className?: string;
  placeholder?: string;
}

/**
 * Input form with text input and send button.
 * Uses ChatContext to send messages. Disabled during loading.
 */
export function Composer({ className, placeholder = 'Ask something...' }: ComposerProps) {
  const { sendMessage, isLoading } = useChatContext();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className || ''}`}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--bui-bg-surface,#18181b)] border border-[var(--bui-border,#27272a)] rounded-xl px-4 py-3 pr-12 text-sm text-[var(--bui-fg,#f4f4f5)] placeholder-[var(--bui-fg-faint,#52525b)] focus:outline-none focus:border-[var(--bui-border-strong,#3f3f46)] transition-colors"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--bui-fg-secondary,#a1a1aa)] hover:text-[var(--bui-fg,#f4f4f5)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </form>
  );
}
