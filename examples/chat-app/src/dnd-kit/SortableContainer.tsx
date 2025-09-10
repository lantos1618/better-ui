import React, {
  Ref,
  useRef,
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useContext,
  createElement,
  useLayoutEffect,
  useCallback,
  memo,
} from 'react';
import {
  useSortable,
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDndContext, useDndMonitor } from '@dnd-kit/core';

import {
  ItemInfo,
  CONTANER_TYPE,
  ContainerInfo,
  SORTING_STRAGETY,
  SortableContainerProps,
} from './types';
import { useMoves } from './MoveContext';
import { mergeRefs } from './utils/utils';
import { SortableItem } from './SortableItem';
import { CustomMotion } from './CustomMotion';
import { useDragState } from './DragStateContext';
import { ParentIdContext } from './ParentIdContext';
import { IdGenerator, generateIdForContainer, generateIdForItem } from './utils/idGeneration';

export const SortableContainer = memo(
  forwardRef<HTMLElement, SortableContainerProps>(
    ({ dndKitId, children, prevTag, containerType, ...props }, forwardedRef) => {
      const {
        registerContainer,
        registerItem,
        isEditMode,
        getChildrenOf,
        addMove,
        getItem,
        nodeRegistry,
      } = useMoves();
      const { isOutsideOfContainer, isValidDropTarget, activeItem, setActiveItem } = useDragState();
      const [sortingStrategy, setSortingStrategy] = useState<null | SORTING_STRAGETY>(null);
      const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

      const parentId = useContext(ParentIdContext);
      const containerRef = useRef(null);

      const containerId = useMemo(() => {
        return generateIdForContainer(
          {
            props: {
              'data-magicpath-path': props['data-magicpath-path'],
              'data-magicpath-uuid': props['data-magicpath-uuid'],
              'data-magicpath-id': props['data-magicpath-id'],
              dndKitId: dndKitId,
            },
            key: null,
            type: '',
          },
          containerType
        );
      }, [dndKitId, containerType, props]);

      const context = useDndContext();

      const isValid = isValidDropTarget(containerId);

      useDndMonitor({
        onDragMove({ over, activatorEvent, delta }) {
          if (!over || !isOutsideOfContainer || !isValidDropTarget(over.id.toString())) {
            setInsertionIndex(null);
            return;
          }

          if (over.id !== containerId) {
            setInsertionIndex(prev => {
              if (prev !== null) return null;
              return prev;
            });

            return;
          }

          const childIds: string[] = getChildrenOf(containerId) || [];

          if (!childIds.length) {
            setInsertionIndex(0);
            return;
          }

          const evt = activatorEvent as PointerEvent;
          const pointerX = evt.clientX + delta.x;
          const pointerY = evt.clientY + delta.y;

          const isVertical = sortingStrategy === SORTING_STRAGETY.VERTICAL;
          let newIndex = childIds.length;

          for (let i = 0; i < childIds.length; i++) {
            const node = getItem(childIds[i]);
            if (!node) continue;

            const r = context.droppableRects.get(childIds[i]);

            if (!r) {
              newIndex = 0;
            } else {
              const midpoint = isVertical ? r.top + r.height / 2 : r.left + r.width / 2;

              if ((isVertical && pointerY < midpoint) || (!isVertical && pointerX < midpoint)) {
                newIndex = i;
                break;
              }
            }
          }

          setInsertionIndex(prev => (prev !== newIndex ? newIndex : prev));
        },
        onDragEnd({ active, over }) {
          if (typeof (window as any).__endDragMode === 'function') {
            (window as any).__endDragMode();
          }

          setInsertionIndex(prev => {
            if (prev !== null) return null;
            return prev;
          });

          if (!over) return;

          if (active.id === over.id) return;

          if (!isOutsideOfContainer) {
            if (active.data.current?.sortable.containerId !== containerId) return;

            const childIds: string[] = getChildrenOf(containerId) || [];

            const oldIndex = childIds.indexOf(active.id.toString()) ?? -1;
            const newIndex = childIds.indexOf(over.id.toString()) ?? -1;

            if (oldIndex !== -1 && newIndex !== -1) {
              addMove({
                itemId: active.id.toString(),
                destContainerId: containerId,
                sourceContainerId: containerId,
                oldIndex,
                newIndex,
              });
            }
          } else {
            if (over.id !== containerId) return;

            const childIds: string[] =
              getChildrenOf(active.data.current!.sortable.containerId) || [];

            const oldIndex = childIds.indexOf(active.id.toString()) ?? -1;

            addMove({
              itemId: active.id.toString(),
              destContainerId: containerId,
              sourceContainerId: active.data.current!.sortable.containerId,
              newIndex: insertionIndex!,
              oldIndex,
            });
          }
        },
        onDragCancel() {
          if (typeof (window as any).__endDragMode === 'function') {
            (window as any).__endDragMode();
          }
          setInsertionIndex(null);
        },
      });

      const { setNodeRef, listeners } = useSortable({
        id: containerId,
        disabled: !isEditMode,
        data: {
          path: (children as any)?.props?.['data-magicpath-path'],
          type: 'container',
        },
      });

      useLayoutEffect(() => {
        const containerInfo: ContainerInfo = {
          dataMagicpathPath: props['data-magicpath-path'],
          dataMagicpathId: props['data-magicpath-id'],
          dndKitId: props['dndKitId'],
          type: containerType,
          parentId,
        };

        registerContainer(containerId, containerInfo);
      }, [containerId, parentId]);

      useLayoutEffect(() => {
        if (!containerRef.current) return;

        const resolveStrategy = () => {
          const { display, flexDirection } = getComputedStyle(containerRef.current!);

          if (display.includes('flex')) {
            return flexDirection.startsWith('row')
              ? SORTING_STRAGETY.HORIZONTAL
              : SORTING_STRAGETY.VERTICAL;
          }

          if (display.includes('grid')) {
            return SORTING_STRAGETY.GRD;
          }

          return SORTING_STRAGETY.VERTICAL;
        };

        const apply = () =>
          setSortingStrategy(prev => {
            const newStrategy = resolveStrategy();
            if (newStrategy === prev) return prev;
            return newStrategy;
          });

        const observer = new ResizeObserver(apply);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
      }, [containerRef]);

      const processedChildren = useMemo(() => {
        const processed: Array<{
          id: string;
          node: React.ReactElement;
        }> = [];

        React.Children.forEach(children, child => {
          if (!React.isValidElement(child)) {
            return;
          }

          const childProps = (child.props as any) || {};
          const motionTag = childProps['data-magicpath-motion-tag'];

          const element = motionTag
            ? createElement(CustomMotion, { ...childProps, children: null }, childProps.children)
            : child;

          const childId = childProps.dndKitId
            ? generateIdForContainer(element, childProps.containerType)
            : generateIdForItem(element, containerType, props['data-magicpath-path']);

          processed.push({
            id: childId,
            node: element,
          });
        });

        return processed;
      }, [containerType, children]);

      useEffect(() => {
        processedChildren.forEach((child, index) => {
          const alreadyRegistered = !!getItem(child.id);

          if (alreadyRegistered) {
            //otherwise state update inside components doesn't work. If data set in the state for examle. It returns empty state without this line
            //I know it's an anti patters but otherwise i have infinite rerenders
            nodeRegistry.itemNodes[child.id] = child.node;
            return;
          }

          const isContainer = IdGenerator.isContainerId(child.id.toString());
          const isTemplateInstance = IdGenerator.isTemplateId(child.id.toString());

          const itemInfo: ItemInfo = {
            dataMagicpathPath: child.node.props?.['data-magicpath-path'],
            dataMagicpathId: child.node.props?.['data-magicpath-id'],
            dataMagicpathUuid: child.node.props?.['data-magicpath-uuid'],
            dndKitId: child.node.props?.['dndKitId'],
            containerId,
            type: isTemplateInstance ? 'template' : isContainer ? 'container' : 'item',
            templateSourceId:
              containerType === CONTANER_TYPE.TEMPLATE
                ? IdGenerator.getTemplateSourceId(child.id) || undefined
                : undefined,
          };

          registerItem(child.id, containerId, child.node, itemInfo, index);
        });
      }, [processedChildren, containerId, containerType]);

      const refs: Array<Ref<unknown>> = [forwardedRef, containerRef, setNodeRef];

      const ref = mergeRefs(...refs);

      const childIds: string[] = useMemo(
        () => getChildrenOf(containerId) || [],
        [containerId, getChildrenOf]
      );

      const renderedContent = useMemo(() => {
        if (!isEditMode) return [];

        return childIds.map((id, index) => {
          const node = getItem(id);

          return (
            <SortableItem
              key={id}
              id={id}
              node={node as React.ReactElement}
              parentId={containerId}
              highlightTop={
                sortingStrategy === SORTING_STRAGETY.VERTICAL && insertionIndex === index
              }
              highlightBottom={
                sortingStrategy === SORTING_STRAGETY.VERTICAL && insertionIndex === index + 1
              }
              highlightLeft={
                sortingStrategy !== SORTING_STRAGETY.VERTICAL && insertionIndex === index
              }
              highlightRight={
                sortingStrategy !== SORTING_STRAGETY.VERTICAL && insertionIndex === index + 1
              }
            />
          );
        });
      }, [childIds, containerId, isEditMode, insertionIndex, getItem]);

      const renderContainer = useCallback(
        (content: React.ReactNode) => {
          const isMotion = prevTag.includes('motion');
          const ContainerComponent = isMotion ? CustomMotion : prevTag;

          return createElement(
            ContainerComponent,
            {
              ...props,
              ...listeners,
              ...(isMotion ? { prevTag } : {}),
              style: {
                ...props.style,
              },
              ref,
            },
            <ParentIdContext.Provider value={containerId}>
              <SortableContext
                id={containerId}
                disabled={!isEditMode}
                items={childIds}
                strategy={sortingStrategyMappers[sortingStrategy || SORTING_STRAGETY.HORIZONTAL]}
              >
                {content}
              </SortableContext>
            </ParentIdContext.Provider>
          );
        },
        [childIds, containerId, sortingStrategy, parentId, props.style, activeItem]
      );

      if (!isEditMode) {
        return renderContainer(children);
      }

      return renderContainer(renderedContent);
    }
  )
);

const sortingStrategyMappers = {
  [SORTING_STRAGETY.GRD]: rectSortingStrategy,
  [SORTING_STRAGETY.HORIZONTAL]: horizontalListSortingStrategy,
  [SORTING_STRAGETY.VERTICAL]: verticalListSortingStrategy,
};
