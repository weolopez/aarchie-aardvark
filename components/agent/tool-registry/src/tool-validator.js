const TOOL_SCHEMA = {
  type: 'object',
  required: ['id', 'name', 'version', 'func', 'schema', 'type', 'permissions', 'created'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,50}$' },
    version: { type: 'number', minimum: 1 },
    func: { type: 'string' },
    schema: { type: 'object' }, // JSON Schema for parameters
    type: { enum: ['system', 'user'] },
    permissions: {
      type: 'array',
      items: { enum: ['network', 'fs', 'ui'] }
    },
    created: { type: 'string', format: 'date-time' }
  }
};

export function validateTool(tool) {
  // Basic validation - in real implementation, use a proper JSON Schema validator
  const required = TOOL_SCHEMA.required;
  for (const field of required) {
    if (!(field in tool)) {
      return false;
    }
  }

  if (typeof tool.name !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(tool.name)) {
    return false;
  }

  if (typeof tool.version !== 'number' || tool.version < 1) {
    return false;
  }

  if (!['system', 'user'].includes(tool.type)) {
    return false;
  }

  if (!Array.isArray(tool.permissions) ||
      !tool.permissions.every(p => ['network', 'fs', 'ui'].includes(p))) {
    return false;
  }

  // Check created is valid ISO string
  if (isNaN(Date.parse(tool.created))) {
    return false;
  }

  return true;
}
