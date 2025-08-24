import type { ToolDefinition, ToolRegistry } from '../types/index';

class ToolRegistryImpl implements ToolRegistry {
  tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

export const globalRegistry = new ToolRegistryImpl();

export function createRegistry(): ToolRegistry {
  return new ToolRegistryImpl();
}