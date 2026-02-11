'use client';

import React from 'react';
import {
  isTextUIPart,
  isToolOrDynamicToolUIPart,
  getToolOrDynamicToolName,
  type UIMessage,
} from 'ai';
import type { Tool } from '../tool';
import { ToolResult } from './ToolResult';

export interface MessageProps {
  message: UIMessage;
  tools: Record<string, Tool>;
  loadingTools: Record<string, boolean>;
  getOnAction: (toolCallId: string, toolName: string) => (input: Record<string, unknown>) => void;
  className?: string;
}

/**
 * Renders a single UIMessage.
 * - User messages: right-aligned bubble
 * - Assistant messages: left-aligned bubble
 * - Tool parts: renders tool.View automatically
 */
export function Message({ message, tools, loadingTools, getOnAction, className }: MessageProps) {
  const textContent = message.parts
    .filter(isTextUIPart)
    .map(part => part.text)
    .join('');

  const toolParts: Array<{
    toolName: string;
    toolCallId: string;
    state: string;
    output: unknown;
  }> = [];

  for (const part of message.parts) {
    if (isToolOrDynamicToolUIPart(part)) {
      const toolName = getToolOrDynamicToolName(part);
      toolParts.push({
        toolName,
        toolCallId: part.toolCallId,
        state: part.state,
        output: part.state === 'output-available' ? part.output : null,
      });
    }
  }

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {textContent && (
        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              message.role === 'user'
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-zinc-800 text-zinc-200'
            }`}
          >
            {textContent}
          </div>
        </div>
      )}

      {toolParts.map((toolPart) => (
        <ToolResult
          key={toolPart.toolCallId}
          toolName={toolPart.toolName}
          toolCallId={toolPart.toolCallId}
          output={toolPart.output}
          hasResult={toolPart.state === 'output-available'}
          isToolLoading={!!loadingTools[toolPart.toolCallId]}
          tools={tools}
          getOnAction={getOnAction}
        />
      ))}
    </div>
  );
}
