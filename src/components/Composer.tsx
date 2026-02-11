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
    <form onSubmit={handleSubmit} className={`flex gap-3 ${className || ''}`}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="px-5 py-3 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-xl hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Send
      </button>
    </form>
  );
}
