import type { CSSProperties, PropsWithChildren } from 'react';
import { useDndMonitor, type UniqueIdentifier } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cloneElement, memo } from 'react';

import { IdGenerator } from './utils/idGeneration';
import { useDragState } from './DragStateContext';
import { useMoves } from './MoveContext';

interface Props {
  id: UniqueIdentifier;
  parentId: string;
  highlightTop?: boolean;
  highlightBottom?: boolean;
  highlightLeft?: boolean;
  highlightRight?: boolean;
  node: React.ReactElement;
}

export const SortableItem = memo(function SortableItem({
  id,
  highlightTop,
  highlightBottom,
  highlightLeft,
  highlightRight,
  node,
}: PropsWithChildren<Props>) {
  const { isEditMode } = useMoves();

  const isContainer = IdGenerator.isContainerId(id.toString());
  const isTemplateInstance = IdGenerator.isTemplateId(id.toString());

  const { setNodeRef, listeners, isDragging, transform, transition } = useSortable({
    id,
    disabled: !isEditMode,
    data: {
      path: node.props?.['data-magicpath-path'],
      type: isTemplateInstance ? 'template' : isContainer ? 'container' : 'item',
    },
  });

  const { setActiveItem } = useDragState();

  const style: CSSProperties = {
    opacity: isDragging ? 0.5 : undefined,
    outline: isDragging ? '1px solid red' : undefined,
    zIndex: isDragging ? '19314123' : undefined,
    transform: CSS.Translate.toString(transform),
    transition,
  };

  useDndMonitor({
    onDragStart({ active }) {
      if (active.id !== id) return;

      if (typeof (window as any).__startDragMode === 'function') {
        (window as any).__startDragMode();
      }

      setActiveItem({
        id: active.id.toString(),
        node: node,
        type: isTemplateInstance ? 'template' : isContainer ? 'container' : 'item',
      });
    },
    onDragEnd({ active }) {
      if (active.id !== id) return;

      setActiveItem(null);
    },
  });
  const isHighlightActive = highlightTop || highlightBottom || highlightLeft || highlightRight;
  const highlightColor = '#3b82f6';

  const mergedStyle = {
    ...(node.props as any)?.style,
    ...style,
    ...(isHighlightActive && { border: `2px dotted ${highlightColor}` }),
    ...(highlightTop && { borderTop: `2px solid ${highlightColor}` }),
    ...(highlightBottom && { borderBottom: `2px solid ${highlightColor}` }),
    ...(highlightLeft && { borderLeft: `2px solid ${highlightColor}` }),
    ...(highlightRight && { borderRight: `2px solid ${highlightColor}` }),
  };

  const childClassName = (node.props as any).className
    ?.replace(/transition-all|duration-\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  //@ts-ignore
  const { children: propsChildren, ...childPropsNoKids } = node.props;

  const newProps = {
    ...listeners,
    ...childPropsNoKids,
    ref: setNodeRef,
    style: mergedStyle,
    className: `${childClassName || ''} ${isHighlightActive ? '' : 'outline outline-1 outline-black/10'}`,
  };

  return cloneElement(node, newProps, propsChildren);
});
