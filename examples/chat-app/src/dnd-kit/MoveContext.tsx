import { isEqual } from 'lodash';
import { arrayMove } from '@dnd-kit/sortable';
import { UniqueIdentifier } from '@dnd-kit/core';
import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';

import {
  AddMove,
  ContainerInfo,
  ItemInfo,
  Move,
  MoveContextType,
  MoveHistory,
  NodeRegistry,
} from './types';

const MoveContext = createContext<MoveContextType | null>(null);

export function MoveProvider({ children }: { children: React.ReactNode }) {
  const [nodeRegistry, setNodeRegistry] = useState<NodeRegistry>({
    itemToParent: {},
    containerToChildren: {},
    itemNodes: {},
  });

  const [containerInfo, setContainerInfo] = useState<Record<string, ContainerInfo>>({});
  const [itemInfo, setItemInfo] = useState<Record<string, ItemInfo>>({});
  // const [templateGroups, setTemplateGroups] = useState<Record<string, string[]>>({});
  const [pendingMove, setPendingMove] = useState<Move | null>(null);
  const [pendingUndoMove, setPendingUndoMove] = useState<Move | null>(null);
  const [isEditMode, setIsEditMode] = useState((window as any).__editModeActive || false);

  const [history, setHistory] = useState<MoveHistory>({
    moves: [],
    currentIndex: -1,
  });

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (!e.data || typeof e.data.type !== 'string') return;

      if (e.data.type === 'TOGGLE_EDIT_MODE') {
        setIsEditMode(!!e.data.active);
      }
    };

    window.addEventListener('message', listener);

    return () => window.removeEventListener('message', listener);
  }, []);

  const getChildrenOf = useCallback(
    (containerId: UniqueIdentifier): string[] | null => {
      return nodeRegistry.containerToChildren[containerId] || null;
    },
    [nodeRegistry]
  );

  const getContainerOf = useCallback(
    (itemId: UniqueIdentifier): string | null => {
      return nodeRegistry.itemToParent[itemId] || null;
    },
    [nodeRegistry]
  );

  const getItem = useCallback(
    (itemId: UniqueIdentifier): React.ReactNode | null => {
      return nodeRegistry.itemNodes[itemId] || null;
    },
    [nodeRegistry]
  );

  useEffect(() => {
    if (pendingMove) {
      const sourceContainerInfo = containerInfo[pendingMove.sourceContainerId];
      const destContainerInfo = containerInfo[pendingMove.destContainerId];

      window.parent.postMessage(
        {
          type: 'ELEMENT_MOVED',
          magicpathId: pendingMove.dataMagicpathId,
          magicpathPath: pendingMove.dataMagicpathPath,
          magicpathUuid: pendingMove.dataMagicpathUuid,
          move: {
            destContainerId: destContainerInfo.dataMagicpathId,
            destContainerPath: destContainerInfo.dataMagicpathPath,
            sourceContainerId: sourceContainerInfo.dataMagicpathId,
            sourceContainerPath: sourceContainerInfo.dataMagicpathPath,
            newIndex: pendingMove.newIndex,
            oldIndex: pendingMove.oldIndex,
            timestamp: pendingMove.timestamp,
            moveId: pendingMove.id,
            type: pendingMove.type,
          },
        },
        '*'
      );

      setPendingMove(null);
    }
  }, [pendingMove]);

  useEffect(() => {
    if (pendingUndoMove) {
      window.parent.postMessage(
        {
          type: 'UNDO_ELEMENT_MOVED',
          magicpathId: pendingUndoMove.dataMagicpathId,
          magicpathPath: pendingUndoMove.dataMagicpathPath,
          moveId: pendingUndoMove.id,
        },
        '*'
      );

      setPendingUndoMove(null);
    }
  }, [pendingUndoMove]);

  const addMove = (moveData: Omit<AddMove, 'timestamp'>) => {
    const { itemId, sourceContainerId, destContainerId, newIndex, oldIndex } = moveData;

    const info = itemInfo[itemId];

    const move: Move = {
      ...moveData,
      id: `move_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
      dataMagicpathId: info.dataMagicpathId,
      dataMagicpathPath: info.dataMagicpathPath,
      dataMagicpathUuid: info.dataMagicpathUuid,
      type: info.type,
    };

    setHistory(prev => {
      if (prev.moves.some(m => m.id === move.id)) return prev;
      const moves = [...prev.moves.slice(0, prev.currentIndex + 1), move];
      return { moves, currentIndex: moves.length - 1 };
    });

    setPendingMove(move);

    moveNode({ itemId, sourceContainerId, destContainerId, newIndex, oldIndex });
  };

  const undo = useCallback(() => {
    if (history.currentIndex < 0) return;
    const move = history.moves[history.currentIndex];

    setHistory(h => ({ ...h, currentIndex: h.currentIndex - 1 }));
    setPendingUndoMove(move);

    moveNode({
      itemId: move.itemId,
      sourceContainerId: move.destContainerId,
      destContainerId: move.sourceContainerId,
      newIndex: move.oldIndex,
      oldIndex: move.newIndex,
    });
  }, [history]);

  const redo = useCallback(() => {
    if (history.currentIndex >= history.moves.length - 1) return;
    const move = history.moves[history.currentIndex + 1];

    setHistory(h => ({ ...h, currentIndex: h.currentIndex + 1 }));
    setPendingMove(move);
    moveNode({
      itemId: move.itemId,
      sourceContainerId: move.sourceContainerId,
      destContainerId: move.destContainerId,
      newIndex: move.newIndex,
      oldIndex: move.oldIndex,
    });
  }, [history]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      if (
        ((event.ctrlKey && event.key === 'y') ||
          (event.metaKey && event.shiftKey && event.key === 'z')) &&
        !event.altKey
      ) {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const registerContainer = (containerId: string, info: ContainerInfo) => {
    setContainerInfo(prev => {
      const existing = prev[containerId];
      const unchanged =
        existing &&
        existing.dataMagicpathPath === info.dataMagicpathPath &&
        existing.type === info.type &&
        existing.parentId === info.parentId;

      return unchanged ? prev : { ...prev, [containerId]: info };
    });

    setNodeRegistry(prev => {
      if (prev.containerToChildren[containerId]) return prev;

      return {
        ...prev,
        containerToChildren: {
          ...prev.containerToChildren,
          [containerId]: [],
        },
      };
    });
  };

  const registerItem = (
    itemId: string,
    containerId: string,
    node: React.ReactNode,
    info: ItemInfo,
    index: number
  ) => {
    setNodeRegistry(prev => {
      const currentParent = prev.itemToParent[itemId];
      const currentChildren = prev.containerToChildren[containerId] || [];
      const currentIndex = currentChildren.indexOf(itemId);

      if (
        currentParent === containerId &&
        currentIndex === index &&
        prev.itemNodes[itemId] !== node
      ) {
        return prev;
      }

      const newRegistry = { ...prev };

      // Update item to parent mapping
      newRegistry.itemToParent[itemId] = containerId;

      // Update container's children list
      const children = [...(newRegistry.containerToChildren[containerId] || [])];
      const existingIndex = children.indexOf(itemId);

      if (existingIndex !== -1) {
        // Remove from old position
        children.splice(existingIndex, 1);
      }

      // Insert at new position
      if (typeof index === 'number' && index >= 0) {
        children.splice(index, 0, itemId);
      } else {
        children.push(itemId);
      }

      newRegistry.containerToChildren[containerId] = children;

      newRegistry.itemNodes[itemId] = node;

      return newRegistry;
    });

    setItemInfo(prev => {
      if (isEqual(prev[itemId], info)) return prev;

      return {
        ...prev,
        [itemId]: info,
      };
    });

    // if (info.templateSourceId) {
    //   setTemplateGroups(prev => {
    //     const group = prev[info.templateSourceId!] || [];

    //     if (!group.includes(itemId)) {
    //       return {
    //         ...prev,
    //         [info.templateSourceId!]: [...group, itemId],
    //       };
    //     }
    //     return prev;
    //   });
    // }
  };

  // const getTemplateInstances = useCallback(
  //   (templateId: string): string[] => {
  //     return templateGroups[templateId] || [];
  //   },
  //   [templateGroups]
  // );

  const moveNode = ({ itemId, sourceContainerId, destContainerId, newIndex, oldIndex }) => {
    setNodeRegistry(prev => {
      const srcId = sourceContainerId;
      const dstId = destContainerId;

      if (srcId === dstId && oldIndex === newIndex) return prev;

      const nextContainerToChildren = { ...prev.containerToChildren };

      if (srcId === dstId) {
        nextContainerToChildren[srcId] = arrayMove(
          [...prev.containerToChildren[srcId]],
          oldIndex,
          newIndex
        );

        return { ...prev, containerToChildren: nextContainerToChildren };
      }

      const srcChildren = [...(prev.containerToChildren[srcId] || [])];
      const destChildren = [...(prev.containerToChildren[dstId] || [])];

      const idx = srcChildren.indexOf(itemId);
      if (idx === -1) return prev;

      srcChildren.splice(idx, 1);
      destChildren.splice(newIndex, 0, itemId);

      nextContainerToChildren[srcId] = srcChildren;
      nextContainerToChildren[dstId] = destChildren;

      const nextItemToParent =
        srcId === dstId ? prev.itemToParent : { ...prev.itemToParent, [itemId]: dstId };

      return {
        ...prev,
        containerToChildren: nextContainerToChildren,
        itemToParent: nextItemToParent,
      };
    });
  };

  const value = {
    addMove,
    isEditMode,
    getItem,
    getChildrenOf,
    moveNode,
    getContainerOf,
    registerContainer,
    registerItem,
    nodeRegistry,
    containerInfo,
    // getTemplateInstances,
  };

  return <MoveContext.Provider value={value}>{children}</MoveContext.Provider>;
}

export function useMoves() {
  const context = useContext(MoveContext);
  if (!context) {
    throw new Error('useMoves must be used within MoveProvider');
  }
  return context;
}
