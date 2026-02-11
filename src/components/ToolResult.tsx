'use client';

import React from 'react';
import type { Tool } from '../tool';

export interface ToolResultProps {
  toolName: string;
  toolCallId: string;
  output: unknown;
  hasResult: boolean;
  isToolLoading: boolean;
  tools: Record<string, Tool>;
  getOnAction: (toolCallId: string, toolName: string) => (input: Record<string, unknown>) => void;
  className?: string;
}

/**
 * Renders a tool's View component given tool name and output.
 * Looks up the tool from the provided tools map and renders its View with proper props.
 */
export function ToolResult({
  toolName,
  toolCallId,
  output,
  hasResult,
  isToolLoading,
  tools,
  getOnAction,
  className,
}: ToolResultProps) {
  const toolDef = tools[toolName];

  if (!toolDef) {
    return (
      <div className={`text-sm text-zinc-500 px-4 py-2 bg-zinc-800/50 rounded-lg ${className || ''}`}>
        Unknown tool: {toolName}
      </div>
    );
  }

  return (
    <div className={className || ''}>
      <toolDef.View
        data={output}
        loading={!hasResult || isToolLoading}
        onAction={getOnAction(toolCallId, toolName)}
      />
    </div>
  );
}
