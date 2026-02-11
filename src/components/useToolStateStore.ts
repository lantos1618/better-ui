'use client';

import { useSyncExternalStore, useCallback } from 'react';

// ============================================
// Types
// ============================================

export interface ToolStateEntry {
  output: unknown;
  loading: boolean;
  error: string | null;
  version: number;
  toolName?: string;
}

export interface ToolStateStore {
  get: (toolCallId: string) => ToolStateEntry | undefined;
  set: (toolCallId: string, entry: ToolStateEntry) => void;
  subscribe: (toolCallId: string, listener: () => void) => () => void;
  subscribeAll: (listener: () => void) => () => void;
  getSnapshot: () => Map<string, ToolStateEntry>;
}

// ============================================
// Factory
// ============================================

export function createToolStateStore(): ToolStateStore {
  const state = new Map<string, ToolStateEntry>();
  const keyListeners = new Map<string, Set<() => void>>();
  const globalListeners = new Set<() => void>();

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
      state.set(toolCallId, entry);
      notifyKey(toolCallId);
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
  };
}

// ============================================
// Hook
// ============================================

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
