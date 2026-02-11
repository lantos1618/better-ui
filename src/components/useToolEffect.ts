'use client';

import { useEffect, useRef } from 'react';
import type { ToolStateStore, ToolStateEntry } from './useToolStateStore';

export type ToolEffectCallback = (entry: ToolStateEntry, toolCallId: string) => void;

/**
 * Subscribe to tool state changes and fire a callback when a specific tool produces output.
 * Only fires once per version to prevent duplicate callbacks.
 */
export function useToolEffect(
  store: ToolStateStore,
  toolName: string,
  callback: ToolEffectCallback
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const firedVersionsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return store.subscribeAll(() => {
      const snapshot = store.getSnapshot();
      for (const [toolCallId, entry] of snapshot) {
        if (entry.toolName !== toolName) continue;
        if (entry.loading) continue;
        if (entry.error) continue;
        if (entry.output == null) continue;

        const lastFired = firedVersionsRef.current.get(toolCallId) ?? 0;
        if (entry.version > lastFired) {
          firedVersionsRef.current.set(toolCallId, entry.version);
          callbackRef.current(entry, toolCallId);
        }
      }
    });
  }, [store, toolName]);
}
