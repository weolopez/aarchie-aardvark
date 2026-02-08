import { validateTool } from './tool-validator.js';

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.events = new Map();
  }

  // Lifecycle
  async load() {
    // Load from IndexedDB Global Store
    // For now, stub - will integrate with Global Store later
    this.emit('registry:loaded');
  }

  async save() {
    // Persist to IndexedDB Global Store
    // For now, stub
    this.emit('registry:persisted');
  }

  // Registry Management
  register(tool) {
    if (!validateTool(tool)) {
      throw new Error('Invalid tool schema');
    }
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already exists`);
    }
    this.tools.set(tool.name, tool);
    this.emit('tool:registered', tool);
  }

  unregister(name) {
    if (!this.tools.has(name)) {
      throw new Error(`Tool ${name} not found`);
    }
    const tool = this.tools.get(name);
    this.tools.delete(name);
    this.emit('tool:unregistered', tool);
  }

  get(name) {
    return this.tools.get(name) || undefined;
  }

  list() {
    return Array.from(this.tools.values());
  }

  has(name) {
    return this.tools.has(name);
  }

  // Events
  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(handler);
    return () => {
      const handlers = this.events.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  emit(event, data) {
    const handlers = this.events.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}

export default ToolRegistry;
