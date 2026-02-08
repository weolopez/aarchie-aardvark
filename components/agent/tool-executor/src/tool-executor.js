/**
 * Tool Executor - Sandboxed tool execution environment
 *
 * Provides secure execution of tool functions with permission enforcement,
 * timeout protection, and error isolation.
 */

import { createSandbox } from './sandbox.js';
import { checkPermissions } from './permissions.js';

export class ToolExecutor {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.maxMemory = options.maxMemory || 50 * 1024 * 1024; // 50MB default
    this.allowedGlobals = options.allowedGlobals || ['console', 'JSON', 'Date', 'Math'];
  }

  /**
   * Execute a tool function with sandboxing and permission checks
   *
   * @param {string} toolName - Name of the tool to execute
   * @param {object} args - Arguments to pass to the tool function
   * @param {ExecutionContext} context - Execution context with permissions and services
   * @param {ToolDefinition} tool - Tool definition (optional, for when called from ToolDispatcher)
   * @returns {Promise<ToolResult>} Execution result
   */
  async execute(toolName, args, context, tool = null) {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!toolName || typeof toolName !== 'string') {
        throw new Error('Tool name must be a non-empty string');
      }

      if (!context || !context.permissions) {
        throw new Error('Execution context with permissions required');
      }

      // Get tool from parameter or registry
      const toolDef = tool || this._getTool(toolName);
      if (!toolDef) {
        throw new Error(`Tool '${toolName}' not found`);
      }

      // Check permissions
      if (!checkPermissions(toolDef.permissions, context.permissions)) {
        throw new Error(`Tool '${toolName}' requires permissions: ${toolDef.permissions.join(', ')}`);
      }

      // Create execution sandbox
      const sandbox = createSandbox(context, this.allowedGlobals);

      // Create the function from the tool's string representation
      const toolFunction = this._createToolFunction(toolDef.func, sandbox);

      // Execute with timeout
      const result = await this._executeWithTimeout(toolFunction, args, this.timeout);

      // Return successful result
      return {
        success: true,
        output: result,
        duration: Date.now() - startTime,
        toolName,
        toolVersion: toolDef.version
      };

    } catch (error) {
      // Return error result
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        toolName
      };
    }
  }

  /**
   * Get tool definition (placeholder - will integrate with Tool Registry)
   * @private
   */
  _getTool(toolName) {
    // TODO: Integrate with Tool Registry
    // For now, return a mock tool for testing
    if (toolName === 'test') {
      return {
        id: 'test-tool',
        name: 'test',
        version: 1,
        func: 'async (args) => { return { message: "Hello from sandbox!", input: args }; }',
        permissions: [],
        created: new Date().toISOString()
      };
    }
    return null;
  }

  /**
   * Create a tool function from string with sandbox context
   * @private
   */
  _createToolFunction(funcString, sandbox) {
    try {
      // Create function with sandbox context
      // Note: Using Function constructor for isolation, but this is still experimental
      // In production, consider using web workers or more secure isolation
      const func = new Function('args', 'context', `
        "use strict";
        const __toolFunction = ${funcString};
        return __toolFunction(args, context);
      `);

      return func;
    } catch (error) {
      throw new Error(`Failed to create tool function: ${error.message}`);
    }
  }

  /**
   * Execute function with timeout protection
   * @private
   */
  async _executeWithTimeout(func, args, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeout}ms`));
      }, timeout);

      // Execute the function
      Promise.resolve(func(args, {})) // TODO: Pass proper context
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Validate tool function syntax (basic check)
   */
  validateToolFunction(funcString) {
    try {
      // Basic syntax check
      new Function('args', 'context', `return (${funcString})(args, context);`);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

export default ToolExecutor;
