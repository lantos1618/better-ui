'use client';

import { useState, useEffect } from 'react';
import type { ToolStateStore, ToolStateEntry } from './useToolStateStore';

// ============================================
// Types
// ============================================

export interface ToolOutputResult<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
  toolCallId: string | null;
}

// ============================================
// Helpers
// ============================================

function findBest(store: ToolStateStore, toolName: string): { toolCallId: string; entry: ToolStateEntry } | null {
  const snapshot = store.getSnapshot();
  let best: { toolCallId: string; entry: ToolStateEntry } | null = null;
  for (const [toolCallId, entry] of snapshot) {
    if (entry.toolName !== toolName) continue;
    if (entry.output == null && !entry.loading) continue;
    if (!best || entry.version >= best.entry.version) {
      best = { toolCallId, entry };
    }
  }
  return best;
}

// ============================================
// Hook
// ============================================

/**
 * Subscribe to the latest output for a specific tool by name.
 * Scans all store entries for matching `toolName`, picks the most recent.
 */
export function useToolOutput<T = unknown>(
  store: ToolStateStore,
  toolName: string
): ToolOutputResult<T> {
  const [result, setResult] = useState<ToolOutputResult<T>>(() => {
    const best = findBest(store, toolName);
    if (!best) return { data: null, loading: false, error: null, toolCallId: null };
    return {
      data: best.entry.output as T | null,
      loading: best.entry.loading,
      error: best.entry.error,
      toolCallId: best.toolCallId,
    };
  });

  useEffect(() => {
    function update() {
      const best = findBest(store, toolName);

      setResult(prev => {
        if (!best) {
          if (prev.data === null && !prev.loading && prev.error === null && prev.toolCallId === null) return prev;
          return { data: null, loading: false, error: null, toolCallId: null };
        }

        const next = {
          data: best.entry.output as T | null,
          loading: best.entry.loading,
          error: best.entry.error,
          toolCallId: best.toolCallId,
        };

        if (
          prev.data === next.data &&
          prev.loading === next.loading &&
          prev.error === next.error &&
          prev.toolCallId === next.toolCallId
        ) {
          return prev;
        }

        return next;
      });
    }

    // Check current state on mount / when deps change
    update();

    // Subscribe to all store changes
    return store.subscribeAll(update);
  }, [store, toolName]);

  return result;
}
