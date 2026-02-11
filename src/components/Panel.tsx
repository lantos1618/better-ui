'use client';

import React, { useSyncExternalStore, useCallback } from 'react';
import type { Tool } from '../tool';
import type { ToolStateStore, ToolStateEntry } from './useToolStateStore';
import { useChatContext } from './ChatProvider';

// ============================================
// Types
// ============================================

export interface PanelProps {
  toolStateStore: ToolStateStore;
  tools: Record<string, Tool>;
  getOnAction: (toolCallId: string, toolName: string) => (input: Record<string, unknown>) => void;
  className?: string;
}

// ============================================
// Panel (standalone)
// ============================================

export function Panel({ toolStateStore, tools, getOnAction, className }: PanelProps) {
  const subscribe = useCallback(
    (listener: () => void) => toolStateStore.subscribeAll(listener),
    [toolStateStore]
  );

  const getSnapshot = useCallback(
    () => toolStateStore.getSnapshot(),
    [toolStateStore]
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Find most recent tool output (highest version with output)
  let selected: { toolCallId: string; entry: ToolStateEntry } | null = null;
  for (const [toolCallId, entry] of snapshot) {
    if (entry.output == null && !entry.loading) continue;
    if (!selected || entry.version > selected.entry.version) {
      selected = { toolCallId, entry };
    }
  }

  const toolName = selected?.entry.toolName;
  const toolDef = toolName ? tools[toolName] : undefined;

  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col ${className || ''}`}>
      {selected && toolDef ? (
        <>
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-400 uppercase tracking-wider">{toolName}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <toolDef.View
              data={selected.entry.output}
              loading={selected.entry.loading}
              onAction={getOnAction(selected.toolCallId, toolName!)}
            />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600 text-sm">Tool output will appear here</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// ChatPanel (convenience wrapper)
// ============================================

export function ChatPanel({ className }: { className?: string }) {
  const { tools, toolStateStore, getOnAction } = useChatContext();
  return (
    <Panel
      toolStateStore={toolStateStore}
      tools={tools}
      getOnAction={getOnAction}
      className={className}
    />
  );
}
