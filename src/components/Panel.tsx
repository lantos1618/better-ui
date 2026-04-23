'use client';

import React, { useSyncExternalStore, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import type { Tool } from '../tool';
import type { ToolStateStore, ToolStateEntry } from './useToolStateStore';
import { useChatContext } from './ChatProvider';

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
    <div className={`bg-[var(--bui-bg-surface,#18181b)] border border-[var(--bui-border,#27272a)] flex flex-col ${className || ''}`}>
      {items.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          {items.map(({ toolCallId, entry }) => {
            const toolName = entry.toolName;
            const toolDef = toolName ? tools[toolName] : undefined;
            if (!toolDef) return null;

            return (
              <div key={toolCallId} className="border-b border-[var(--bui-border,#27272a)] last:border-b-0">
                <div className="px-4 py-3 border-b border-[var(--bui-border,#27272a)]/50 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--bui-success,#059669)]" />
                  <span className="text-xs text-[var(--bui-fg-secondary,#a1a1aa)] uppercase tracking-wider">{toolName}</span>
                </div>
                <div className="p-4">
                  <toolDef.View
                    data={entry.output}
                    loading={entry.loading}
                    onAction={getOnAction(toolCallId, toolName!)}
                    error={entry.error ? new Error(entry.error) : null}
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
            <div className="w-10 h-10 rounded-xl bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)]/50 flex items-center justify-center">
              <Sparkles size={20} strokeWidth={1.5} className="text-[var(--bui-fg-faint,#52525b)]" />
            </div>
            <div>
              <p className="text-[var(--bui-fg-muted,#71717a)] text-sm font-medium">Canvas</p>
              <p className="text-[var(--bui-fg-faint,#52525b)] text-xs mt-1">Tool results will render here as you chat</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
