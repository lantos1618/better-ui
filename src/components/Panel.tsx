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
  /** When set, only show output from this specific tool name */
  tool?: string;
  /** Tool names to exclude from selection */
  excludeTools?: string[];
  /** Maximum number of items to display (default 5) */
  maxItems?: number;
}

// ============================================
// Panel (standalone)
// ============================================

export function Panel({ toolStateStore, tools, getOnAction, className, tool: filterTool, excludeTools, maxItems = 5 }: PanelProps) {
  const subscribe = useCallback(
    (listener: () => void) => toolStateStore.subscribeAll(listener),
    [toolStateStore]
  );

  const getSnapshot = useCallback(
    () => toolStateStore.getSnapshot(),
    [toolStateStore]
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Build display list: group by entityId, keep highest seqNo per entity + all ungrouped
  const entityLatest = new Map<string, { toolCallId: string; entry: ToolStateEntry }>();
  const ungrouped: Array<{ toolCallId: string; entry: ToolStateEntry }> = [];

  for (const [toolCallId, entry] of snapshot) {
    if (filterTool && entry.toolName !== filterTool) continue;
    if (excludeTools && entry.toolName && excludeTools.includes(entry.toolName)) continue;
    if (entry.output == null && !entry.loading) continue;

    if (entry.entityId) {
      const current = entityLatest.get(entry.entityId);
      if (!current || (entry.seqNo ?? 0) > (current.entry.seqNo ?? 0)) {
        entityLatest.set(entry.entityId, { toolCallId, entry });
      }
    } else {
      ungrouped.push({ toolCallId, entry });
    }
  }

  // Combine entity latest + ungrouped, sort by seqNo descending
  const items = [...entityLatest.values(), ...ungrouped]
    .sort((a, b) => (b.entry.seqNo ?? 0) - (a.entry.seqNo ?? 0))
    .slice(0, maxItems);

  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col ${className || ''}`}>
      {items.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          {items.map(({ toolCallId, entry }) => {
            const toolName = entry.toolName;
            const toolDef = toolName ? tools[toolName] : undefined;
            if (!toolDef) return null;

            return (
              <div key={toolCallId} className="border-b border-zinc-800 last:border-b-0">
                <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">{toolName}</span>
                </div>
                <div className="p-4">
                  <toolDef.View
                    data={entry.output}
                    loading={entry.loading}
                    onAction={getOnAction(toolCallId, toolName!)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          {/* Grid dot pattern */}
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
              </svg>
            </div>
            <div>
              <p className="text-zinc-500 text-sm font-medium">Canvas</p>
              <p className="text-zinc-600 text-xs mt-1">Tool results will render here as you chat</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ChatPanel (convenience wrapper)
// ============================================

export function ChatPanel({ className, tool, excludeTools, maxItems }: { className?: string; tool?: string; excludeTools?: string[]; maxItems?: number }) {
  const { tools, toolStateStore, getOnAction } = useChatContext();
  return (
    <Panel
      toolStateStore={toolStateStore}
      tools={tools}
      getOnAction={getOnAction}
      className={className}
      tool={tool}
      excludeTools={excludeTools}
      maxItems={maxItems}
    />
  );
}
