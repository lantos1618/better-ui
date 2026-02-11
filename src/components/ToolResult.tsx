'use client';

import React, { useEffect, useRef, useSyncExternalStore, useCallback } from 'react';
import type { Tool } from '../tool';
import { useToolState, type ToolStateStore } from './useToolStateStore';

export interface ToolResultProps {
  toolName: string;
  toolCallId: string;
  output: unknown;
  toolInput?: unknown;
  hasResult: boolean;
  toolStateStore: ToolStateStore;
  tools: Record<string, Tool>;
  getOnAction: (toolCallId: string, toolName: string) => (input: Record<string, unknown>) => void;
  onConfirm?: (toolCallId: string, toolName: string, toolInput: Record<string, unknown>) => void;
  onReject?: (toolCallId: string, toolName: string) => void;
  className?: string;
}

// ============================================
// useIsCollapsed hook
// ============================================

/**
 * Returns true if this toolCallId is "collapsed" — i.e. there's another entry
 * with the same entityId and a higher seqNo, meaning a newer version supersedes it.
 */
function useIsCollapsed(
  toolStateStore: ToolStateStore,
  toolCallId: string,
): boolean {
  const subscribe = useCallback(
    (listener: () => void) => toolStateStore.subscribeAll(listener),
    [toolStateStore]
  );

  const getSnapshot = useCallback(() => {
    const snapshot = toolStateStore.getSnapshot();
    const myEntry = snapshot.get(toolCallId);
    if (!myEntry?.entityId) return false;

    const mySeqNo = myEntry.seqNo ?? 0;
    for (const [id, entry] of snapshot) {
      if (id !== toolCallId && entry.entityId === myEntry.entityId && (entry.seqNo ?? 0) > mySeqNo) {
        return true;
      }
    }
    return false;
  }, [toolStateStore, toolCallId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ============================================
// ToolResult
// ============================================

/**
 * Renders a tool's View component given tool name and output.
 * Uses the tool state store for in-place updates (e.g. counter clicks),
 * falling back to message part state.
 *
 * For HITL tools (confirm: true), renders a confirmation card when
 * the tool is awaiting user approval.
 *
 * Supports groupKey-based collapsing: when a newer call with the same
 * entityId exists, renders a minimal chip instead of the full view.
 */
export function ToolResult({
  toolName,
  toolCallId,
  output,
  toolInput,
  hasResult,
  toolStateStore,
  tools,
  getOnAction,
  onConfirm,
  onReject,
  className,
}: ToolResultProps) {
  const storeState = useToolState(toolStateStore, toolCallId);
  const toolDef = tools[toolName];

  // Seed the store from message part state so Panel/useToolOutput can find entries.
  // Also compute + store entityId and toolInput for grouping/conditional confirm.
  useEffect(() => {
    const existing = toolStateStore.get(toolCallId);
    const entityId = toolDef?.getGroupKey?.(toolInput);
    if (!existing) {
      toolStateStore.set(toolCallId, {
        output: hasResult ? output : null,
        loading: !hasResult,
        error: null,
        version: 1,
        toolName,
        entityId,
        toolInput,
      });
    } else if (hasResult && output != null && !existing.output && existing.loading) {
      // Transition from loading → output available
      toolStateStore.set(toolCallId, {
        ...existing,
        output,
        loading: false,
        entityId: existing.entityId ?? entityId,
        toolInput: existing.toolInput ?? toolInput,
      });
    } else if (!existing.entityId && entityId) {
      // Patch entityId if not yet set
      toolStateStore.set(toolCallId, {
        ...existing,
        entityId,
        toolInput: existing.toolInput ?? toolInput,
      });
    }
  }, [hasResult, output, toolCallId, toolName, toolInput, toolStateStore, toolDef]);

  // Collapsing: self-detect if a newer entry with same entityId exists
  const isCollapsed = useIsCollapsed(toolStateStore, toolCallId);

  if (!toolDef) {
    return (
      <div className={`text-sm text-zinc-500 px-4 py-2 bg-zinc-800/50 rounded-lg ${className || ''}`}>
        Unknown tool: {toolName}
      </div>
    );
  }

  // Collapsed chip — minimal representation for superseded grouped calls
  if (isCollapsed) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/50 rounded text-xs text-zinc-500 ${className || ''}`}>
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
        {toolName}
      </div>
    );
  }

  // HITL confirmation logic
  const isHITL = toolDef.requiresConfirmation;
  const needsUserConfirm = isHITL && toolDef.shouldConfirm(toolInput);
  const hasOutput = hasResult || !!storeState?.output;
  const isRejected = storeState?.status === 'rejected';
  const isConfirming = storeState?.loading && storeState?.status === 'confirmed';

  // Auto-approve path: HITL tool but shouldConfirm returns false for this input
  const autoApprovedRef = useRef(false);
  useEffect(() => {
    if (isHITL && !needsUserConfirm && !hasOutput && !autoApprovedRef.current && toolInput != null) {
      autoApprovedRef.current = true;
      onConfirm?.(toolCallId, toolName, (toolInput ?? {}) as Record<string, unknown>);
    }
  }, [isHITL, needsUserConfirm, hasOutput, toolInput, toolCallId, toolName, onConfirm]);

  // Confirmation card: only shown when needsUserConfirm is true
  if (needsUserConfirm && !hasOutput && !isRejected && !isConfirming) {
    const inputObj = (toolInput && typeof toolInput === 'object') ? toolInput as Record<string, unknown> : null;

    return (
      <div className={`bg-zinc-800 border border-amber-700/50 rounded-xl p-4 ${className || ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          <p className="text-zinc-300 text-sm font-medium">
            {toolName} requires confirmation
          </p>
        </div>
        {inputObj != null && (
          <div className="bg-zinc-900 rounded-lg p-3 mb-3 space-y-1">
            {Object.entries(inputObj).map(([key, value]) => (
              <div key={key}>
                <span className="text-zinc-500 text-xs">{key}: </span>
                <span className="text-zinc-300 text-sm whitespace-pre-wrap">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm?.(toolCallId, toolName, (toolInput ?? {}) as Record<string, unknown>)}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => onReject?.(toolCallId, toolName)}
            className="px-4 py-2 bg-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-600 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    );
  }

  // HITL rejected state
  if (isHITL && isRejected) {
    return (
      <div className={`bg-zinc-800 border border-red-900/50 rounded-xl p-4 ${className || ''}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded">
            Rejected
          </span>
          <p className="text-zinc-400 text-sm">{toolName}</p>
        </div>
      </div>
    );
  }

  // Store takes priority over message part state
  const resolvedOutput = storeState?.output ?? output;
  const resolvedLoading = storeState?.loading ?? !hasResult;

  return (
    <div className={className || ''}>
      <toolDef.View
        data={resolvedOutput}
        loading={resolvedLoading}
        onAction={getOnAction(toolCallId, toolName)}
      />
    </div>
  );
}
