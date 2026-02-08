/**
 * Sandbox - Isolated execution environment for tool functions
 *
 * Creates a secure context for tool execution with controlled access
 * to browser APIs and external services.
 */

/**
 * Create a sandboxed execution context
 *
 * @param {ExecutionContext} context - Execution context with services and permissions
 * @param {string[]} allowedGlobals - List of allowed global objects
 * @returns {object} Sandbox context object
 */
export function createSandbox(context, allowedGlobals = []) {
  const sandbox = {};

  // Add allowed global objects
  allowedGlobals.forEach(globalName => {
    if (typeof globalThis[globalName] !== 'undefined') {
      sandbox[globalName] = globalThis[globalName];
    }
  });

  // Add controlled access to context services based on permissions
  if (context.fileStore && context.permissions.includes('fs')) {
    sandbox.fileStore = {
      read: context.fileStore.read.bind(context.fileStore, context.repo),
      write: context.fileStore.write.bind(context.fileStore, context.repo),
      list: context.fileStore.list.bind(context.fileStore, context.repo),
      exists: context.fileStore.exists.bind(context.fileStore, context.repo)
    };
  }

  if (context.postMessage && context.permissions.includes('ui')) {
    sandbox.postMessage = context.postMessage;
  }

  if (context.permissions.includes('network')) {
    sandbox.fetch = globalThis.fetch;
  }

  // Add utility functions
  sandbox.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Add safe versions of potentially dangerous functions
  sandbox.setTimeout = (callback, delay) => {
    if (delay > 30000) { // Max 30 second delay
      throw new Error('Timeout delay cannot exceed 30 seconds');
    }
    return globalThis.setTimeout(callback, delay);
  };

  sandbox.setInterval = (callback, delay) => {
    if (delay < 100) { // Min 100ms interval
      throw new Error('Interval delay must be at least 100ms');
    }
    return globalThis.setInterval(callback, delay);
  };

  // Override potentially dangerous globals
  sandbox.eval = undefined;
  sandbox.Function = undefined;
  sandbox.WebAssembly = undefined;
  sandbox.importScripts = undefined;

  // Block access to browser APIs that could be security risks
  sandbox.window = undefined;
  sandbox.document = undefined;
  sandbox.navigator = undefined;
  sandbox.localStorage = undefined;
  sandbox.sessionStorage = undefined;
  sandbox.indexedDB = undefined;
  sandbox.WebSocket = undefined;
  sandbox.XMLHttpRequest = undefined;

  return sandbox;
}

/**
 * Execute code in sandbox (alternative approach using with() statement)
 * Note: This is experimental and may not be supported in all environments
 *
 * @param {string} code - Code to execute
 * @param {object} sandbox - Sandbox context
 * @param {object} args - Arguments to pass to the code
 * @returns {*} Execution result
 */
export function executeInSandbox(code, sandbox, args = {}) {
  // This approach uses the 'with' statement to create a scope
  // WARNING: 'with' is deprecated and not recommended for production use
  // Consider using web workers for better isolation in production

  const sandboxKeys = Object.keys(sandbox);
  const sandboxValues = Object.values(sandbox);

  try {
    // Create a function with sandbox variables in scope
    const func = new Function(...sandboxKeys, `
      "use strict";
      return (async (args) => {
        ${code}
      })(arguments[${sandboxKeys.length}]);
    `);

    return func(...sandboxValues, args);
  } catch (error) {
    throw new Error(`Sandbox execution failed: ${error.message}`);
  }
}

export default { createSandbox, executeInSandbox };
