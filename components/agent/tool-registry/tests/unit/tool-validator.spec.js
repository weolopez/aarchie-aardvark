import { describe, it, expect } from '../../test-utils.js';
import { validateTool } from '../src/tool-validator.js';

describe('validateTool', () => {
  it('should validate a correct tool', () => {
    const tool = {
      id: 'test-id',
      name: 'test_tool',
      version: 1,
      func: 'async () => "test"',
      schema: { type: 'object', properties: {} },
      type: 'system',
      permissions: ['fs'],
      created: new Date().toISOString()
    };

    expect(validateTool(tool)).toBe(true);
  });

  it('should reject tool missing required fields', () => {
    const invalidTool = { name: 'test' };
    expect(validateTool(invalidTool)).toBe(false);
  });

  it('should reject invalid name', () => {
    const tool = {
      id: 'test-id',
      name: 'invalid name with spaces',
      version: 1,
      func: 'async () => "test"',
      schema: { type: 'object', properties: {} },
      type: 'system',
      permissions: [],
      created: new Date().toISOString()
    };

    expect(validateTool(tool)).toBe(false);
  });

  it('should reject invalid version', () => {
    const tool = {
      id: 'test-id',
      name: 'test_tool',
      version: 0,
      func: 'async () => "test"',
      schema: { type: 'object', properties: {} },
      type: 'system',
      permissions: [],
      created: new Date().toISOString()
    };

    expect(validateTool(tool)).toBe(false);
  });

  it('should reject invalid type', () => {
    const tool = {
      id: 'test-id',
      name: 'test_tool',
      version: 1,
      func: 'async () => "test"',
      schema: { type: 'object', properties: {} },
      type: 'invalid',
      permissions: [],
      created: new Date().toISOString()
    };

    expect(validateTool(tool)).toBe(false);
  });

  it('should reject invalid permissions', () => {
    const tool = {
      id: 'test-id',
      name: 'test_tool',
      version: 1,
      func: 'async () => "test"',
      schema: { type: 'object', properties: {} },
      type: 'system',
      permissions: ['invalid'],
      created: new Date().toISOString()
    };

    expect(validateTool(tool)).toBe(false);
  });

  it('should reject invalid created date', () => {
    const tool = {
      id: 'test-id',
      name: 'test_tool',
      version: 1,
      func: 'async () => "test"',
      schema: { type: 'object', properties: {} },
      type: 'system',
      permissions: [],
      created: 'invalid-date'
    };

    expect(validateTool(tool)).toBe(false);
  });
});
