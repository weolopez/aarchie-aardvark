/**
 * Tool Dispatcher - Coordinates Tool Execution
 *
 * Manages tool discovery, validation, and execution through the ToolExecutor.
 * Acts as a bridge between the Agent Core and the tool execution system.
 */

import { ToolExecutor } from '/components/agent/tool-executor/src/index.js';

export class ToolDispatcher {
  constructor() {
    this.toolExecutor = new ToolExecutor();
    this.currentRepository = null;
    this.availableTools = new Map();
    this._initializeBuiltInTools();
  }

  /**
   * Set the current repository context
   * @param {string} repo - Repository identifier (owner/repo)
   */
  async setRepository(repo) {
    this.currentRepository = repo;
    // Update tool permissions based on repository context
    await this._updateRepositoryPermissions();
  }

  /**
   * Execute a tool by name
   * @param {string} toolName - Name of the tool to execute
   * @param {object} args - Tool arguments
   * @param {ExecutionContext} context - Execution context
   * @returns {Promise<ToolResult>}
   */
  async execute(toolName, args, context) {
    const tool = this.availableTools.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
        duration: 0
      };
    }

    // Validate arguments against tool schema
    const validation = this._validateArguments(args, tool);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid arguments: ${validation.errors.join(', ')}`,
        duration: 0
      };
    }

    // Check permissions
    const permissionCheck = this._checkPermissions(tool, context);
    if (!permissionCheck.granted) {
      return {
        success: false,
        error: `Tool requires permissions: ${permissionCheck.missing.join(', ')}`,
        duration: 0
      };
    }

      // Execute the tool
      try {
        const result = await this.toolExecutor.execute(toolName, args, context, tool);
        return result;
      } catch (error) {
        return {
          success: false,
          error: `Tool execution failed: ${error.message}`,
          duration: 0
        };
      }
  }

  /**
   * Get all available tools
   * @returns {ToolDefinition[]} Array of tool definitions
   */
  getAvailableTools() {
    return Array.from(this.availableTools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      permissions: tool.permissions
    }));
  }

  /**
   * Register a custom tool
   * @param {ToolDefinition} toolDef - Tool definition
   */
  registerTool(toolDef) {
    this.availableTools.set(toolDef.name, {
      ...toolDef,
      type: 'custom'
    });
  }

  /**
   * Unregister a tool
   * @param {string} toolName - Name of the tool to remove
   */
  unregisterTool(toolName) {
    this.availableTools.delete(toolName);
  }

  /**
   * Initialize built-in tools
   * @private
   */
  _initializeBuiltInTools() {
    const builtInTools = [
      {
        name: 'execute_javascript',
        description: 'Execute JavaScript code in a sandboxed environment',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'JavaScript code to execute'
            }
          },
          required: ['code']
        },
        permissions: [],
        type: 'builtin',
        func: 'async (args, context) => { try { return { result: eval(args.code), success: true }; } catch (error) { return { error: error.message, success: false }; } }',
        version: 1
      },
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read'
            }
          },
          required: ['path']
        },
        permissions: ['fs'],
        type: 'builtin',
        func: 'async (args, context) => { return { content: "Mock file content for " + args.path, success: true }; }',
        version: 1
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to write'
            },
            content: {
              type: 'string',
              description: 'Content to write to the file'
            }
          },
          required: ['path', 'content']
        },
        permissions: ['fs'],
        type: 'builtin',
        func: 'async (args, context) => { return { success: true, message: "File written to " + args.path }; }',
        version: 1
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory to list'
            }
          },
          required: ['path']
        },
        permissions: ['fs'],
        type: 'builtin',
        func: 'async (args, context) => { return { files: ["file1.txt", "file2.js"], success: true }; }',
        version: 1
      },
      {
        name: 'run_terminal_command',
        description: 'Execute a terminal command',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command to execute'
            },
            cwd: {
              type: 'string',
              description: 'Working directory for the command'
            }
          },
          required: ['command']
        },
        permissions: ['fs'],
        type: 'builtin',
        func: 'async (args, context) => { return { output: "Command executed: " + args.command, success: true }; }',
        version: 1
      },
      {
        name: 'search_files',
        description: 'Search for text in files using grep',
        parameters: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Text pattern to search for'
            },
            path: {
              type: 'string',
              description: 'Directory to search in'
            },
            include: {
              type: 'string',
              description: 'File pattern to include (e.g., *.js,*.ts)'
            }
          },
          required: ['pattern']
        },
        permissions: ['fs'],
        type: 'builtin',
        func: 'async (args, context) => { return { matches: ["file1.js:10"], success: true }; }',
        version: 1
      },
      {
        name: 'http_request',
        description: 'Make an HTTP request',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to request'
            },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE'],
              description: 'HTTP method'
            },
            headers: {
              type: 'object',
              description: 'Request headers'
            },
            body: {
              type: 'string',
              description: 'Request body'
            }
          },
          required: ['url']
        },
        permissions: ['network'],
        type: 'builtin',
        func: 'async (args, context) => { return { status: 200, data: "Mock response", success: true }; }',
        version: 1
      },
      {
        name: 'show_notification',
        description: 'Show a notification to the user',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Notification message'
            },
            type: {
              type: 'string',
              enum: ['info', 'success', 'warning', 'error'],
              description: 'Notification type'
            }
          },
          required: ['message']
        },
        permissions: ['ui'],
        type: 'builtin',
        func: 'async (args, context) => { console.log("Notification:", args.message); return { success: true }; }',
        version: 1
      }
    ];

    for (const tool of builtInTools) {
      this.availableTools.set(tool.name, tool);
    }
  }

  /**
   * Update permissions based on repository context
   * @private
   */
  async _updateRepositoryPermissions() {
    // In a real implementation, this would check repository permissions
    // For now, we allow all permissions when a repository is loaded
    if (this.currentRepository) {
      // Repository-specific permission logic would go here
    }
  }

  /**
   * Validate tool arguments against schema
   * @private
   * @param {object} args - Arguments to validate
   * @param {ToolDefinition} tool - Tool definition
   * @returns {ValidationResult} Validation result
   */
  _validateArguments(args, tool) {
    const errors = [];

    // Check required parameters
    if (tool.parameters && tool.parameters.required) {
      for (const required of tool.parameters.required) {
        if (!(required in args)) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }

    // Basic type checking for known parameters
    if (tool.parameters && tool.parameters.properties) {
      for (const [param, config] of Object.entries(tool.parameters.properties)) {
        if (param in args) {
          const value = args[param];
          const expectedType = config.type;

          if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(`Parameter '${param}' must be a string`);
          } else if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(`Parameter '${param}' must be a number`);
          } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
            errors.push(`Parameter '${param}' must be a boolean`);
          } else if (expectedType === 'object' && typeof value !== 'object') {
            errors.push(`Parameter '${param}' must be an object`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if the execution context has required permissions
   * @private
   * @param {ToolDefinition} tool - Tool definition
   * @param {ExecutionContext} context - Execution context
   * @returns {PermissionCheck} Permission check result
   */
  _checkPermissions(tool, context) {
    const required = tool.permissions || [];
    const granted = context.permissions || [];

    const missing = required.filter(perm => !granted.includes(perm));

    return {
      granted: missing.length === 0,
      missing
    };
  }
}
