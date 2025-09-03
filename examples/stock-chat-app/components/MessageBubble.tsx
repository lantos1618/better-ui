'use client';

import React from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  isTyping?: boolean;
}

export default function MessageBubble({ role, content, timestamp, isTyping }: MessageBubbleProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}>
      <div className={`flex items-end max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-500' : isSystem ? 'bg-gray-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
          }`}>
            <span className="text-white text-xs font-semibold">
              {isUser ? 'U' : isSystem ? 'S' : 'AI'}
            </span>
          </div>
        </div>
        
        {/* Message Content */}
        <div>
          <div className={`px-4 py-2 rounded-2xl ${
            isUser 
              ? 'bg-blue-500 text-white rounded-br-sm' 
              : isSystem
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-bl-sm border border-gray-200 dark:border-gray-700'
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700'
          }`}>
            {isTyping ? (
              <div className="flex space-x-1 py-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
            )}
          </div>
          
          {/* Timestamp */}
          {timestamp && (
            <p className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}