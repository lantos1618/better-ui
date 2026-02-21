'use client';

import { useSyncExternalStore, useCallback } from 'react';

export interface ToolStateEntry {
  output: unknown;
  loading: boolean;
  error: string | null;
  version: number;
  toolName?: string;
  /** HITL confirmation status */
  status?: 'pending' | 'confirmed' | 'rejected';
  /** Entity group key — "toolName:groupKey(input)" — groups related calls */
  entityId?: string;
  /** Raw tool input, stored for conditional confirm checks */
  toolInput?: unknown;
  /** Auto-incrementing insertion order (store-assigned) */
  seqNo?: number;
}

export interface ToolStateStore {
  get: (toolCallId: string) => ToolStateEntry | undefined;
  set: (toolCallId: string, entry: ToolStateEntry) => void;
  /** Remove all entries (e.g. when switching threads) */
  clear: () => void;
  subscribe: (toolCallId: string, listener: () => void) => () => void;
  subscribeAll: (listener: () => void) => () => void;
  getSnapshot: () => Map<string, ToolStateEntry>;
  /** Returns Map with highest-seqNo entry per entityId + all ungrouped entries */
  getLatestPerEntity: () => Map<string, ToolStateEntry>;
  /** Returns the oldest (lowest seqNo) entry with the given entityId — the "anchor" */
  findAnchor: (entityId: string) => { toolCallId: string; entry: ToolStateEntry } | undefined;
}

export function createToolStateStore(): ToolStateStore {
  let state = new Map<string, ToolStateEntry>();
  const keyListeners = new Map<string, Set<() => void>>();
  const globalListeners = new Set<() => void>();
  let seqCounter = 0;

  function notifyKey(toolCallId: string) {
    const listeners = keyListeners.get(toolCallId);
    if (listeners) {
      for (const l of listeners) l();
    }
    for (const l of globalListeners) l();
  }

  return {
    get(toolCallId: string) {
      return state.get(toolCallId);
    },

    set(toolCallId: string, entry: ToolStateEntry) {
      state = new Map(state);
      // Auto-assign seqNo if not already set for this toolCallId
      const existing = state.get(toolCallId);
      const seqNo = existing?.seqNo ?? ++seqCounter;
      state.set(toolCallId, { ...entry, seqNo });
      notifyKey(toolCallId);
    },

    clear() {
      state = new Map();
      seqCounter = 0;
      for (const l of globalListeners) l();
    },

    subscribe(toolCallId: string, listener: () => void) {
      let listeners = keyListeners.get(toolCallId);
      if (!listeners) {
        listeners = new Set();
        keyListeners.set(toolCallId, listeners);
      }
      listeners.add(listener);
      return () => {
        listeners!.delete(listener);
        if (listeners!.size === 0) {
          keyListeners.delete(toolCallId);
        }
      };
    },

    subscribeAll(listener: () => void) {
      globalListeners.add(listener);
      return () => {
        globalListeners.delete(listener);
      };
    },

    getSnapshot() {
      return state;
    },

    findAnchor(entityId: string) {
      let oldest: { toolCallId: string; entry: ToolStateEntry } | undefined;
      for (const [toolCallId, entry] of state) {
        if (entry.entityId === entityId) {
          if (!oldest || (entry.seqNo ?? 0) < (oldest.entry.seqNo ?? 0)) {
            oldest = { toolCallId, entry };
          }
        }
      }
      return oldest;
    },

    getLatestPerEntity() {
      const result = new Map<string, ToolStateEntry>();
      const entityLatest = new Map<string, { toolCallId: string; entry: ToolStateEntry }>();

      for (const [toolCallId, entry] of state) {
        if (entry.entityId) {
          const current = entityLatest.get(entry.entityId);
          if (!current || (entry.seqNo ?? 0) > (current.entry.seqNo ?? 0)) {
            entityLatest.set(entry.entityId, { toolCallId, entry });
          }
        } else {
          // Ungrouped entries pass through
          result.set(toolCallId, entry);
        }
      }

      for (const [, { toolCallId, entry }] of entityLatest) {
        result.set(toolCallId, entry);
      }

      return result;
    },
  };
}

export function useToolState(
  store: ToolStateStore,
  toolCallId: string
): ToolStateEntry | undefined {
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(toolCallId, listener),
    [store, toolCallId]
  );

  const getSnapshot = useCallback(
    () => store.get(toolCallId),
    [store, toolCallId]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
