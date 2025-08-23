import { createToolBuilder } from './core/builder';
import { globalRegistry } from './core/registry';
import type { ToolDefinition, ToolRegistry } from './types';
import { z } from 'zod';

export * from './types';
export { createRegistry } from './core/registry';
export { ClientToolExecutor } from './client/executor';

class AUI {
  private registry: ToolRegistry;
  
  z = z;

  constructor(registry?: ToolRegistry) {
    this.registry = registry || globalRegistry;
  }

  tool(name: string) {
    return createToolBuilder(name);
  }

  register(tool: ToolDefinition) {
    this.registry.register(tool);
    return this;
  }

  getTools() {
    return this.registry.list();
  }

  getTool(name: string) {
    return this.registry.get(name);
  }
}

export const aui = new AUI();
export { z };

export default aui;