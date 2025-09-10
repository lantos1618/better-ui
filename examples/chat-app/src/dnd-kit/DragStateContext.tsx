import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { IdGenerator } from './utils/idGeneration';
import { useMoves } from './MoveContext';
import { DragState, DropZoneStatus } from './types';


const DragStateContext = createContext<DragState | null>(null);

export function DragStateProvider({ children }: { children: React.ReactNode }) {
  const [activeItem, setActiveItem] = useState<{
    id: string;
    node: React.ReactNode;
    type: 'item' | 'container' | 'template' | null;
  } | null>(null);
  const [dropZoneStatuses, setDropZoneStatuses] = useState<Map<string, DropZoneStatus>>(new Map());
  const [isOutsideOfContainer, setIsOutsideOfContainer] = useState(false);

  const outsideRef = useRef(null);

  const { containerInfo, nodeRegistry } = useMoves();

  useEffect(() => {
    if (!activeItem) {
      setDropZoneStatuses(new Map());
      return;
    }

    calculateValidDropZones(activeItem.id);
  }, [activeItem]);

  const calculateValidDropZones = (draggedItemId: string) => {
    const newStatuses = new Map<string, DropZoneStatus>();

    Object.keys(containerInfo).forEach(containerId => {
      const status = evaluateDropZone(draggedItemId, containerId);
      newStatuses.set(containerId, status);
    });

    setDropZoneStatuses(newStatuses);
  };

  const evaluateDropZone = (draggedItemId: string, targetContainerId: string): DropZoneStatus => {
    const draggedComponent = IdGenerator.parseId(draggedItemId);
    const targetComponent = IdGenerator.parseId(targetContainerId);

    if (!draggedComponent || !targetComponent) {
      return {
        containerId: targetContainerId,
        isValid: false,
        reason: 'Invalid ID format',
      };
    }

    if (draggedItemId === targetContainerId) {
      return {
        containerId: targetContainerId,
        isValid: false,
        reason: 'Cannot drop into itself',
      };
    }

    // Check 1: Cannot drop container into its own descendant
    if (isDescendant(draggedItemId, targetContainerId)) {
      return {
        containerId: targetContainerId,
        isValid: false,
        reason: 'Cannot drop a container into its own child',
      };
    }

    // Check 2: Cross-component movement rules
    if (draggedComponent.dataMagicpathPath !== targetComponent.dataMagicpathPath) {
      return {
        containerId: targetContainerId,
        isValid: false,
        reason: 'Cross-file movement not allowed',
      };
    }

    // Check 3: Template compatibility
    if (
      draggedComponent.type === 'template-instance' &&
      targetComponent.type !== 'template-container'
    ) {
      return {
        containerId: targetContainerId,
        isValid: false,
        reason: 'Template instances can only be moved within template containers',
      };
    }

    if (draggedComponent?.type === 'item' && targetComponent.type === 'collection-container')
      return {
        containerId: targetContainerId,
        isValid: false,
        reason: 'Items cannot be moved inside of collections',
      };

    return {
      containerId: targetContainerId,
      isValid: true,
    };
  };

  function isDescendant(activeItemId: string, dropTargetId: string): boolean {
    if (IdGenerator.isItemId(activeItemId)) return false;

    const isActiveContainer = IdGenerator.isContainerId(activeItemId);

    const recursiveSearch = (activeItemId: string, dropTargetId: string): boolean => {
      const childrenIds: string[] = nodeRegistry.containerToChildren[activeItemId];

      if (!childrenIds) return false;

      if (childrenIds.includes(dropTargetId)) return true;

      const childrenContainerIds = childrenIds.filter(id => IdGenerator.isContainerId(id));

      return childrenContainerIds.some(id => recursiveSearch(id, dropTargetId));
    };

    if (isActiveContainer) {
      return recursiveSearch(activeItemId, dropTargetId);
    }

    return false;
  }

  const clearDragState = useCallback(() => {
    setActiveItem(null);
    setDropZoneStatuses(new Map());
  }, []);

  const isValidDropTarget = (containerId: string): boolean => {
    return dropZoneStatuses.get(containerId)?.isValid ?? false;
  };

  const value: DragState = {
    activeItem,
    dropZoneStatuses,
    setActiveItem,
    clearDragState,
    isValidDropTarget,
    isDescendant,
    setIsOutsideOfContainer,
    isOutsideOfContainer,
    outsideRef,
  };

  return <DragStateContext.Provider value={value}>{children}</DragStateContext.Provider>;
}

export function useDragState() {
  const context = useContext(DragStateContext);
  if (!context) {
    throw new Error('useDragState must be used within DragStateProvider');
  }
  return context;
}
