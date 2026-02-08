/**
 * Utils - Helper functions for tool execution
 */

/**
 * Safely stringify an object for logging
 *
 * @param {*} obj - Object to stringify
 * @param {number} maxLength - Maximum length of output
 * @returns {string} Safe string representation
 */
export function safeStringify(obj, maxLength = 1000) {
  try {
    const str = JSON.stringify(obj, null, 2);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '... (truncated)';
    }
    return str;
  } catch (error) {
    return `[Object cannot be stringified: ${error.message}]`;
  }
}

/**
 * Validate function arguments against schema
 *
 * @param {*} args - Arguments to validate
 * @param {object} schema - JSON Schema for validation
 * @returns {object} Validation result
 */
export function validateArgs(args, schema) {
  const errors = [];

  if (!schema || !schema.type) {
    return { valid: true, errors: [] }; // No schema = no validation
  }

  // Basic type checking (expand this for full JSON Schema support)
  if (schema.type === 'object' && typeof args !== 'object') {
    errors.push(`Expected object, got ${typeof args}`);
  }

  if (schema.type === 'string' && typeof args !== 'string') {
    errors.push(`Expected string, got ${typeof args}`);
  }

  if (schema.type === 'number' && typeof args !== 'number') {
    errors.push(`Expected number, got ${typeof args}`);
  }

  if (schema.type === 'boolean' && typeof args !== 'boolean') {
    errors.push(`Expected boolean, got ${typeof args}`);
  }

  if (schema.type === 'array' && !Array.isArray(args)) {
    errors.push(`Expected array, got ${typeof args}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create execution context from tool registry and services
 *
 * @param {object} services - Available services (fileStore, etc.)
 * @param {string} repo - Current repository
 * @param {string[]} permissions - Granted permissions
 * @returns {ExecutionContext} Execution context
 */
export function createExecutionContext(services, repo, permissions) {
  return {
    fileStore: services.fileStore,
    postMessage: services.postMessage,
    permissions: permissions || [],
    repo: repo || '',
    services
  };
}

/**
 * Measure execution time
 *
 * @param {Function} fn - Function to measure
 * @returns {Promise<{result: *, duration: number}>} Result and duration
 */
export async function measureExecution(fn) {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Sanitize error message for user display
 *
 * @param {Error} error - Error object
 * @returns {string} Sanitized error message
 */
export function sanitizeError(error) {
  if (!error) return 'Unknown error';

  // Remove stack traces and sensitive information
  let message = error.message || error.toString();

  // Remove file paths and line numbers
  message = message.replace(/\/[^\s)]+/g, '/[path]');
  message = message.replace(/:\d+/g, ':[line]');

  // Limit length
  if (message.length > 500) {
    message = message.substring(0, 500) + '...';
  }

  return message;
}

export default {
  safeStringify,
  validateArgs,
  createExecutionContext,
  measureExecution,
  sanitizeError
};
