import { UniqueIdentifier } from '@dnd-kit/core';

export enum CONTANER_TYPE {
  COLLECTION = 'collection',
  TEMPLATE = 'template',
  REGULAR = 'regular',
  ITEM = 'item',
}

export enum SORTING_STRAGETY {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal',
  GRD = 'grid',
}

export interface SortableContainerProps extends Record<string, any> {
  dndKitId: string;
  prevTag: string;
  children?: React.ReactNode;
  containerType: string;
}

export interface Move {
  id: string;
  itemId: string;
  destContainerId: string;
  sourceContainerId: string;
  oldIndex: number;
  newIndex: number;
  timestamp: number;
  dataMagicpathId: string;
  dataMagicpathPath: string;
  dataMagicpathUuid: string;
  type: any;
}

export interface AddMove {
  itemId: string;
  destContainerId: string;
  sourceContainerId: string;
  oldIndex: number;
  newIndex: number;
  timestamp: number;
}

export interface MoveHistory {
  moves: Move[];
  currentIndex: number;
}

export type Order = Record<string, string[]>;

export interface MoveContextType {
  addMove: (moveData: Omit<AddMove, 'timestamp'>) => void;
  isEditMode: boolean;
  getItem: (itemId: UniqueIdentifier) => React.ReactNode | null;
  getChildrenOf: (containerId: UniqueIdentifier) => string[] | null;
  moveNode: (params: {
    itemId: UniqueIdentifier;
    sourceContainerId: UniqueIdentifier;
    destContainerId: UniqueIdentifier;
    newIndex: number;
    oldIndex: number;
  }) => void;
  getContainerOf: (itemId: UniqueIdentifier) => string | null;
  registerContainer: (containerId: string, info: ContainerInfo) => void;
  registerItem: (
    itemId: string,
    containerId: string,
    node: React.ReactNode,
    info: ItemInfo,
    index: number
  ) => void;
  nodeRegistry: NodeRegistry;
  containerInfo: Record<string, ContainerInfo>;
}
export interface NodeRegistry {
  itemToParent: Record<string, string>;
  containerToChildren: Record<string, string[]>;
  itemNodes: Record<string, React.ReactNode>;
}

export interface ContainerInfo {
  dataMagicpathPath: string;
  dataMagicpathId: string;
  dndKitId: string;
  type: CONTANER_TYPE;
  parentId: string | null;
}

export interface ItemInfo {
  dataMagicpathPath: string;
  dataMagicpathId: string;
  dataMagicpathUuid: string;
  dndKitId: string;
  type: any;
  containerId: string;
  templateSourceId?: string;
}

export interface DropZoneStatus {
  containerId: string;
  isValid: boolean;
  reason?: string;
}

export interface DragState {
  activeItem: {
    id: string;
    node: React.ReactNode;
    type: 'item' | 'container' | 'template' | null;
  } | null;
  dropZoneStatuses: Map<string, DropZoneStatus>;
  setActiveItem: (
    args: {
      id: string;
      node: React.ReactNode;
      type: 'item' | 'container' | 'template' | null;
    } | null
  ) => void;
  clearDragState: () => void;
  isValidDropTarget: (containerId: string) => boolean;
  isDescendant: (activeItemId: string, dropTargetId: string) => boolean;
  setIsOutsideOfContainer: React.Dispatch<React.SetStateAction<boolean>>;
  isOutsideOfContainer: boolean;
  outsideRef: React.RefObject<boolean | null>;
}