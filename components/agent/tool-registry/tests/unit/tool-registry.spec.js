import { describe, it, expect, beforeEach } from '../../test-utils.js';
import ToolRegistry from '../src/tool-registry.js';

describe('ToolRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('registration', () => {
    it('should register a valid tool', () => {
      const tool = {
        id: 'test-id',
        name: 'test_tool',
        version: 1,
        func: 'async () => "test"',
        schema: { type: 'object', properties: {} },
        type: 'system',
        permissions: [],
        created: new Date().toISOString()
      };

      registry.register(tool);
      expect(registry.has('test_tool')).toBe(true);
      expect(registry.get('test_tool')).toEqual(tool);
    });

    it('should throw on invalid tool', () => {
      const invalidTool = { name: 'test' };
      expect(() => registry.register(invalidTool)).toThrow();
    });

    it('should throw on duplicate name', () => {
      const tool = {
        id: 'test-id',
        name: 'test_tool',
        version: 1,
        func: 'async () => "test"',
        schema: { type: 'object', properties: {} },
        type: 'system',
        permissions: [],
        created: new Date().toISOString()
      };

      registry.register(tool);
      expect(() => registry.register(tool)).toThrow();
    });
  });

  describe('unregistration', () => {
    it('should unregister an existing tool', () => {
      const tool = {
        id: 'test-id',
        name: 'test_tool',
        version: 1,
        func: 'async () => "test"',
        schema: { type: 'object', properties: {} },
        type: 'system',
        permissions: [],
        created: new Date().toISOString()
      };

      registry.register(tool);
      registry.unregister('test_tool');
      expect(registry.has('test_tool')).toBe(false);
    });

    it('should throw on unregistering non-existent tool', () => {
      expect(() => registry.unregister('nonexistent')).toThrow();
    });
  });

  describe('queries', () => {
    it('should list all tools', () => {
      const tool1 = {
        id: 'id1',
        name: 'tool1',
        version: 1,
        func: 'async () => "1"',
        schema: { type: 'object', properties: {} },
        type: 'system',
        permissions: [],
        created: new Date().toISOString()
      };

      const tool2 = {
        id: 'id2',
        name: 'tool2',
        version: 1,
        func: 'async () => "2"',
        schema: { type: 'object', properties: {} },
        type: 'system',
        permissions: [],
        created: new Date().toISOString()
      };

      registry.register(tool1);
      registry.register(tool2);

      const tools = registry.list();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual(['tool1', 'tool2']);
    });

    it('should return undefined for non-existent tool', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('events', () => {
    it('should emit tool:registered event', () => {
      const tool = {
        id: 'test-id',
        name: 'test_tool',
        version: 1,
        func: 'async () => "test"',
        schema: { type: 'object', properties: {} },
        type: 'system',
        permissions: [],
        created: new Date().toISOString()
      };

      let emitted = false;
      registry.on('tool:registered', (registeredTool) => {
        emitted = true;
        expect(registeredTool).toEqual(tool);
      });

      registry.register(tool);
      expect(emitted).toBe(true);
    });

    it('should allow unsubscribing from events', () => {
      let callCount = 0;
      const handler = () => callCount++;

      const unsubscribe = registry.on('tool:registered', handler);
      unsubscribe();

      const tool = {
        id: 'test-id',
        name: 'test_tool',
        version: 1,
        func: 'async () => "test"',
        schema: { type: 'object', properties: {} },
        type: 'system',
        permissions: [],
        created: new Date().toISOString()
      };

      registry.register(tool);
      expect(callCount).toBe(0);
    });
  });
});
