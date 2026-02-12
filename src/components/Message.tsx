'use client';

import React from 'react';
import {
  isTextUIPart,
  isToolOrDynamicToolUIPart,
  getToolOrDynamicToolName,
  type UIMessage,
} from 'ai';
import type { Tool } from '../tool';
import type { ToolStateStore } from './useToolStateStore';
import { ToolResult } from './ToolResult';
import { Markdown } from './Markdown';

export interface MessageProps {
  message: UIMessage;
  tools: Record<string, Tool>;
  toolStateStore: ToolStateStore;
  getOnAction: (toolCallId: string, toolName: string) => (input: Record<string, unknown>) => void;
  onConfirm?: (toolCallId: string, toolName: string, toolInput: Record<string, unknown>) => void;
  onReject?: (toolCallId: string, toolName: string) => void;
  onRetry?: (toolCallId: string, toolName: string, toolInput: unknown) => void;
  className?: string;
}

/**
 * Renders a single UIMessage.
 * - User messages: right-aligned bubble (plain text)
 * - Assistant messages: left-aligned bubble (rendered markdown)
 * - Tool parts: renders tool.View automatically
 */
export function Message({ message, tools, toolStateStore, getOnAction, onConfirm, onReject, onRetry, className }: MessageProps) {
  const rawTextContent = message.parts
    .filter(isTextUIPart)
    .map(part => part.text)
    .join('');

  // Parse structured envelope for state-sync messages.
  // Envelope format: JSON with { text, stateContext, _meta: { hidden } }
  // Plain text messages pass through unchanged.
  const isUser = message.role === 'user';
  let textContent = rawTextContent;
  let isHidden = false;
  if (isUser && textContent) {
    try {
      const envelope = JSON.parse(textContent);
      if (envelope && typeof envelope === 'object' && '_meta' in envelope) {
        textContent = envelope.text || '';
        isHidden = !!envelope._meta?.hidden;
      }
    } catch {
      // Not an envelope — plain text message, use as-is
    }
  }

  const toolParts: Array<{
    toolName: string;
    toolCallId: string;
    state: string;
    output: unknown;
    input: unknown;
  }> = [];

  for (const part of message.parts) {
    if (isToolOrDynamicToolUIPart(part)) {
      const toolName = getToolOrDynamicToolName(part);
      toolParts.push({
        toolName,
        toolCallId: part.toolCallId,
        state: part.state,
        output: part.state === 'output-available' ? part.output : null,
        input: 'input' in part ? part.input : undefined,
      });
    }
  }

  // Fully hidden messages (e.g. autoRespond state-sync) render nothing
  if (isHidden && !textContent && toolParts.length === 0) return null;

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {textContent && !isHidden && (
        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              message.role === 'user'
                ? 'bg-[var(--bui-user-bg,#f4f4f5)] text-[var(--bui-user-fg,#18181b)]'
                : 'bg-[var(--bui-bg-elevated,#27272a)] text-[var(--bui-fg,#f4f4f5)]'
            }`}
          >
            {message.role === 'assistant' ? (
              <Markdown content={textContent} />
            ) : (
              textContent
            )}
          </div>
        </div>
      )}

      {toolParts.map((toolPart) => (
        <ToolResult
          key={toolPart.toolCallId}
          toolName={toolPart.toolName}
          toolCallId={toolPart.toolCallId}
          output={toolPart.output}
          toolInput={toolPart.input}
          hasResult={toolPart.state === 'output-available'}
          toolPartState={toolPart.state}
          toolStateStore={toolStateStore}
          tools={tools}
          getOnAction={getOnAction}
          onConfirm={onConfirm}
          onReject={onReject}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
