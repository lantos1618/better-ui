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
  /** Tool part state from the AI SDK (e.g. 'partial-call', 'call', 'output-available') */
  toolPartState?: string;
  toolStateStore: ToolStateStore;
  tools: Record<string, Tool>;
  getOnAction: (toolCallId: string, toolName: string) => (input: Record<string, unknown>) => void;
  onConfirm?: (toolCallId: string, toolName: string, toolInput: Record<string, unknown>) => void;
  onReject?: (toolCallId: string, toolName: string) => void;
  onRetry?: (toolCallId: string, toolName: string, toolInput: unknown) => void;
  className?: string;
}

/**
 * Returns true if this toolCallId is a "followup" — i.e. there's an older entry
 * (lower seqNo) with the same entityId, meaning an anchor already exists.
 * Followups hide themselves and instead update the anchor's data.
 */
function useIsFollowup(
  toolStateStore: ToolStateStore,
  toolCallId: string,
): boolean {
  const subscribe = useCallback(
    (listener: () => void) => toolStateStore.subscribeAll(listener),
    [toolStateStore]
  );

  const getSnapshot = useCallback(() => {
    const myEntry = toolStateStore.get(toolCallId);
    if (!myEntry?.entityId) return false;

    const anchor = toolStateStore.findAnchor(myEntry.entityId);
    return !!anchor && anchor.toolCallId !== toolCallId;
  }, [toolStateStore, toolCallId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Renders a tool's View component given tool name and output.
 * Uses the tool state store for in-place updates (e.g. counter clicks),
 * falling back to message part state.
 *
 * For HITL tools (confirm: true), renders a confirmation card when
 * the tool is awaiting user approval.
 *
 * Supports groupKey-based in-place updates: when an older call (anchor) with
 * the same entityId exists, followup calls update the anchor's data and render nothing.
 */
export function ToolResult({
  toolName,
  toolCallId,
  output,
  toolInput,
  hasResult,
  toolPartState,
  toolStateStore,
  tools,
  getOnAction,
  onConfirm,
  onReject,
  onRetry,
  className,
}: ToolResultProps) {
  const storeState = useToolState(toolStateStore, toolCallId);
  const toolDef = tools[toolName];

  // Seed the store from message part state so Panel/useToolOutput can find entries.
  // Also compute + store entityId and toolInput for grouping/conditional confirm.
  // For followups (an anchor with the same entityId already exists), update the
  // anchor's output and seed this entry as invisible (output: null, loading: false).
  useEffect(() => {
    const existing = toolStateStore.get(toolCallId);
    const entityId = toolDef?.getGroupKey?.(toolInput);

    // Check if an anchor already exists for this entityId
    const anchor = entityId ? toolStateStore.findAnchor(entityId) : undefined;
    const isFollowup = anchor && anchor.toolCallId !== toolCallId;

    if (!existing) {
      if (isFollowup) {
        // Followup: update anchor's output, seed self as invisible
        if (hasResult && output != null) {
          toolStateStore.set(anchor.toolCallId, {
            ...anchor.entry,
            output,
            loading: false,
          });
        }
        toolStateStore.set(toolCallId, {
          output: null,
          loading: false,
          error: null,
          version: 1,
          toolName,
          entityId,
          toolInput,
        });
      } else {
        toolStateStore.set(toolCallId, {
          output: hasResult ? output : null,
          loading: !hasResult,
          error: null,
          version: 1,
          toolName,
          entityId,
          toolInput,
        });
      }
    } else if (isFollowup) {
      // Followup received new output after initial seed
      if (hasResult && output != null && existing.output == null) {
        toolStateStore.set(anchor.toolCallId, {
          ...toolStateStore.get(anchor.toolCallId)!,
          output,
          loading: false,
        });
        toolStateStore.set(toolCallId, {
          ...existing,
          output: null,
          loading: false,
        });
      }
    } else if (hasResult && output != null && !existing.output && existing.loading) {
      toolStateStore.set(toolCallId, {
        ...existing,
        output,
        loading: false,
        entityId: existing.entityId ?? entityId,
        toolInput: existing.toolInput ?? toolInput,
      });
    } else if (!existing.entityId && entityId) {
      toolStateStore.set(toolCallId, {
        ...existing,
        entityId,
        toolInput: existing.toolInput ?? toolInput,
      });
    }
  }, [hasResult, output, toolCallId, toolName, toolInput, toolStateStore, toolDef]);

  // Followup detection: hide if an older entry (anchor) with same entityId exists
  const isFollowup = useIsFollowup(toolStateStore, toolCallId);

  // HITL confirmation logic — computed before early returns so hooks below are always called
  const isHITL = toolDef?.requiresConfirmation ?? false;
  const needsUserConfirm = isHITL && toolDef!.shouldConfirm(toolInput);
  const hasOutput = hasResult || !!storeState?.output;
  const isRejected = storeState?.status === 'rejected';
  const isConfirming = storeState?.loading && storeState?.status === 'confirmed';

  // Auto-approve path: HITL tool but shouldConfirm returns false for this input.
  // AI SDK v5 states: 'input-streaming' → 'input-available' → 'output-available' | 'output-error'
  // Only act when args are fully available, not during streaming.
  const argsComplete = toolPartState === 'input-available' || toolPartState === 'output-available';
  const autoApprovedRef = useRef(false);
  useEffect(() => {
    if (isHITL && argsComplete && !needsUserConfirm && !hasOutput && !autoApprovedRef.current && toolInput != null) {
      autoApprovedRef.current = true;
      onConfirm?.(toolCallId, toolName, (toolInput ?? {}) as Record<string, unknown>);
    }
  }, [isHITL, argsComplete, needsUserConfirm, hasOutput, toolInput, toolCallId, toolName, onConfirm]);

  // --- Early returns (all hooks are above this line) ---

  if (!toolDef) {
    return (
      <div className={`text-sm text-[var(--bui-fg-muted,#71717a)] px-4 py-2 bg-[var(--bui-bg-elevated,#27272a)]/50 rounded-lg ${className || ''}`}>
        Unknown tool: {toolName}
      </div>
    );
  }

  if (isFollowup) {
    return null;
  }

  // Confirmation card: only shown when args are complete and needsUserConfirm is true
  if (argsComplete && needsUserConfirm && !hasOutput && !isRejected && !isConfirming) {
    const inputObj = (toolInput && typeof toolInput === 'object') ? toolInput as Record<string, unknown> : null;

    // Render simple key/value pairs, skipping arrays/objects to keep it clean
    const simpleEntries = inputObj
      ? Object.entries(inputObj).filter(([, v]) => typeof v !== 'object' || v === null)
      : [];

    return (
      <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-warning-border,rgba(180,83,9,0.5))] rounded-xl overflow-hidden ${className || ''}`}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--bui-warning-border,rgba(180,83,9,0.5))]/50">
          <div className="w-2 h-2 bg-[var(--bui-warning-fg,#f59e0b)] rounded-full" />
          <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm font-medium">
            {toolName} requires confirmation
          </p>
        </div>
        {simpleEntries.length > 0 && (
          <div className="px-4 py-3 space-y-1">
            {simpleEntries.map(([key, value]) => (
              <div key={key}>
                <span className="text-[var(--bui-fg-muted,#71717a)] text-xs">{key}: </span>
                <span className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 px-4 py-3 border-t border-[var(--bui-border,#27272a)]">
          <button
            onClick={() => onConfirm?.(toolCallId, toolName, (toolInput ?? {}) as Record<string, unknown>)}
            className="px-4 py-2 bg-[var(--bui-success,#059669)] text-white text-sm rounded-lg hover:bg-[var(--bui-success,#059669)] transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => onReject?.(toolCallId, toolName)}
            className="px-4 py-2 bg-[var(--bui-bg-hover,#3f3f46)] text-[var(--bui-fg-secondary,#a1a1aa)] text-sm rounded-lg hover:bg-[var(--bui-bg-hover,#3f3f46)] transition-colors"
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
      <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-error-border,rgba(153,27,27,0.5))] rounded-xl p-4 ${className || ''}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--bui-error-fg,#f87171)] bg-[var(--bui-error-muted,rgba(220,38,38,0.08))] px-2 py-0.5 rounded">
            Rejected
          </span>
          <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm">{toolName}</p>
        </div>
      </div>
    );
  }

  // Store takes priority over message part state
  const resolvedOutput = storeState?.output ?? output;
  const resolvedLoading = storeState?.loading ?? !hasResult;

  // Error fallback UI: show error card when tool failed and no output is available
  if (storeState?.error && !resolvedOutput && !resolvedLoading) {
    return (
      <div className={`bg-[var(--bui-error-muted,rgba(220,38,38,0.08))] border border-[var(--bui-error-border,rgba(153,27,27,0.5))] rounded-xl p-4 ${className || ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-[var(--bui-error-fg,#f87171)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-[var(--bui-error-fg,#f87171)] text-sm font-medium">{toolName} failed</span>
        </div>
        <p className="text-[var(--bui-error-fg,#f87171)]/70 text-xs mb-3">{storeState.error}</p>
        {onRetry && (
          <button
            onClick={() => onRetry(toolCallId, toolName, storeState.toolInput ?? toolInput)}
            className="px-3 py-1.5 bg-[var(--bui-error-muted,rgba(220,38,38,0.08))] text-[var(--bui-error-fg,#f87171)] text-xs rounded-lg border border-[var(--bui-error-border,rgba(153,27,27,0.5))] hover:bg-[var(--bui-error-muted,rgba(220,38,38,0.08))] transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={className || ''}>
      <toolDef.View
        data={resolvedOutput}
        loading={resolvedLoading}
        onAction={getOnAction(toolCallId, toolName)}
        error={storeState?.error ? new Error(storeState.error) : null}
      />
    </div>
  );
}
