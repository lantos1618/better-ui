import { CONTANER_TYPE } from '../types';
export interface IdComponents {
  type: 'item' | 'container' | 'template-instance' | 'template-container' | 'collection-container';
  dataMagicpathPath: string;
  elementPath?: string;
  magicId?: string;
  uuid?: string;
  dndKitId?: string;
  templatePath?: string;
}

export class IdGenerator {
  static generateItemId(elementPath: string, magicId: string): string {
    return `item:${elementPath}:${magicId}`;
  }

  static generateContainerId(dataMagicpathPath: string, dndKitId: string): string {
    return `container:${dataMagicpathPath}:${dndKitId}`;
  }

  static generateTemplateInstanceId(uuid: string, templatePath: string, magicId: string): string {
    return `template-instance:${uuid}:${templatePath}:${magicId}`;
  }

  static generateTemplateContainerId(
    uuid: string,
    dataMagicpathPath: string,
    dndKitId: string
  ): string {
    return `template-container:${uuid}:${dataMagicpathPath}:${dndKitId}`;
  }

  static generateCollectionContainerId(
    dndKitId: string,
    dataMagicpathPath: string,
    magicId: string
  ): string {
    return `collection-container:${dndKitId}:${dataMagicpathPath}:${magicId}`;
  }

  static parseId(id: string): IdComponents | null {
    const parts = id.split(':');

    if (parts.length < 3) return null;

    const type = parts[0] as IdComponents['type'];

    switch (type) {
      case 'item':
        return {
          type,
          dataMagicpathPath: parts[1],
          elementPath: parts[2],
          magicId: parts[3],
        };

      case 'container':
        return {
          type,
          dataMagicpathPath: parts[1],
          dndKitId: parts[2],
        };
      case 'collection-container':
        return {
          type,
          dataMagicpathPath: parts[2],
          dndKitId: parts[1],
        };

      case 'template-instance':
        return {
          type,
          uuid: parts[1],
          templatePath: parts[2],
          dataMagicpathPath: parts[2],
          magicId: parts[3],
        };

      case 'template-container':
        return {
          type,
          uuid: parts[1],
          dataMagicpathPath: parts[2],
          dndKitId: parts[3],
        };
      default:
        return null;
    }
  }

  static isContainerId(id: string): boolean {
    return (
      id.startsWith('container:') ||
      id.startsWith('collection-container') ||
      id.startsWith('template-container:')
    );
  }

  static isItemId(id: string): boolean {
    return id.startsWith('item:') || id.startsWith('template-instance:');
  }

  static isTemplateId(id: string): boolean {
    return id.startsWith('template-instance:') || id.startsWith('template-container:');
  }

  static getTemplateSourceId(instanceId: string): string | null {
    const components = this.parseId(instanceId);

    if (components?.type === 'template-instance' && components.templatePath) {
      return `template:${components.templatePath}`;
    }

    return null;
  }
}

export function generateIdForContainer(
  element: React.ReactElement,
  containerType: CONTANER_TYPE
): string {
  const props = element.props as any;
  const magicId = props['data-magicpath-id'];
  const magicPath = props['data-magicpath-path'];
  const dndKitId = props['dndKitId'];
  const uuid = props['data-magicpath-uuid'];

  if (!dndKitId) {
    return generateIdForItem(element, containerType);
  }

  if (containerType === CONTANER_TYPE.TEMPLATE && uuid) {
    return IdGenerator.generateTemplateContainerId(uuid, magicPath, dndKitId);
  }

  if (containerType === CONTANER_TYPE.COLLECTION) {
    return IdGenerator.generateCollectionContainerId(dndKitId, magicPath, magicId);
  }

  return IdGenerator.generateContainerId(magicPath, dndKitId);
}

export function generateIdForItem(
  element: React.ReactElement,
  parentContainerType: CONTANER_TYPE,
  parentPath?: string
): string {
  const props = element.props as any;
  const magicId = props['data-magicpath-id'];
  const magicPath = props['data-magicpath-path'];
  const uuid = props['data-magicpath-uuid'];

  if (
    (parentContainerType === CONTANER_TYPE.TEMPLATE ||
      parentContainerType === CONTANER_TYPE.COLLECTION) &&
    uuid
  ) {
    return IdGenerator.generateTemplateInstanceId(uuid, magicPath, magicId);
  }

  if (!magicPath || !magicId) {
    const componentName =
      (element.type as any)?.displayName || (element.type as any)?.name || 'noname';

    return `item:${componentName}:${parentPath}`;
  }

  return IdGenerator.generateItemId(magicPath, magicId);
}
