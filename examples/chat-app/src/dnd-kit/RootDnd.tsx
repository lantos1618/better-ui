import React from 'react';
import {
  Active,
  useSensor,
  DndContext,
  Collision,
  useSensors,
  ClientRect,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import { cloneElement } from 'react';
import { useDragState } from './DragStateContext';
import { Coordinates } from '@dnd-kit/core/dist/types';
import { restrictToParentElement, snapCenterToCursor } from '@dnd-kit/modifiers';
import { DroppableContainer, RectMap } from '@dnd-kit/core/dist/store';

export function RootDnd({ children }: { children: React.ReactNode }) {
  const {
    activeItem,
    isOutsideOfContainer,
    outsideRef,
    setIsOutsideOfContainer,
    isValidDropTarget,
  } = useDragState();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 50,
      },
    })
  );

  const customCollisionDetector = (args: {
    active: Active;
    collisionRect: ClientRect;
    droppableRects: RectMap;
    droppableContainers: DroppableContainer[];
    pointerCoordinates: Coordinates | null;
  }): Collision[] => {
    const { active, droppableContainers, droppableRects, pointerCoordinates } = args;

    const originContainerId = active.data.current?.sortable.containerId;

    const originRect = droppableRects.get(originContainerId);

    let droppableContainersToUse: DroppableContainer[] = [];

    const pointerInsideOrigin =
      originRect &&
      pointerCoordinates &&
      pointerCoordinates.x >= originRect.left &&
      pointerCoordinates.x <= originRect.right &&
      pointerCoordinates.y >= originRect.top &&
      pointerCoordinates.y <= originRect.bottom;

    const nextIsOutside = !pointerInsideOrigin;

    if (outsideRef?.current !== nextIsOutside) {
      outsideRef.current = nextIsOutside;

      requestAnimationFrame(() => {
        setIsOutsideOfContainer(nextIsOutside);
      });
    }

    if (pointerInsideOrigin || activeItem?.type === 'template') {
      droppableContainersToUse = droppableContainers.filter(
        c => c.data.current!.sortable.containerId == originContainerId
      );

      return rectIntersection({ ...args, droppableContainers: droppableContainersToUse });
    }

    droppableContainersToUse = droppableContainers.filter(
      c => c.data.current?.type === 'container' && isValidDropTarget(c.id.toString())
    );

    return pointerWithin({ ...args, droppableContainers: droppableContainersToUse });
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[...(activeItem?.type === 'template' ? [restrictToParentElement] : [])]}
      collisionDetection={customCollisionDetector}
    >
      {children}
      <DragOverlay
        modifiers={[snapCenterToCursor]}
        style={{
          cursor: 'grabbing',
          opacity: 0.8,
        }}
      >
        {activeItem && isOutsideOfContainer && activeItem.type !== 'template'
          ? cloneElement(activeItem.node as React.ReactElement, {
              //@ts-ignore
              transition: undefined,
              transform: undefined,
              initial: false,
              animate: undefined,
            })
          : null}
      </DragOverlay>
    </DndContext>
  );
}
