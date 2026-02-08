/**
 * Agent Core - Main AI Agent Logic
 *
 * The AgentCore class implements the main AI coding assistant functionality,
 * running in a Web Worker and coordinating with various components to provide
 * intelligent coding assistance with tool execution capabilities.
 */

import { LLMClient } from './llm-client.js';
import { ToolDispatcher } from './tool-dispatcher.js';
import { MessageHandler } from './message-handler.js';
import { AgentConfig } from './config.js';

export class AgentCore {
  constructor() {
    this.config = null;
    this.llmClient = null;
    this.toolDispatcher = null;
    this.messageHandler = null;
    this.isInitialized = false;
    this.currentSession = null;
    this.executionContext = null;
  }

  /**
   * Initialize the agent with configuration
   * @param {AgentConfig} config - Agent configuration
   * @returns {Promise<void>}
   */
  async init(config) {
    if (this.isInitialized) {
      throw new Error('AgentCore is already initialized');
    }

    // Validate configuration
    this.config = AgentConfig.validate(config);

    // Initialize components
    this.llmClient = new LLMClient(this.config);
    this.toolDispatcher = new ToolDispatcher();
    this.messageHandler = new MessageHandler(this);

    // Set up execution context
    this.executionContext = {
      permissions: this.config.defaultPermissions || [],
      repo: null,
      sessionId: null
    };

    this.isInitialized = true;
  }

  /**
   * Process a chat message and return AI response
   * @param {string} message - User message
   * @param {string} sessionId - Session identifier
   * @returns {Promise<ChatResponse>}
   */
  async chat(message, sessionId) {
    if (!this.isInitialized) {
      throw new Error('AgentCore must be initialized before chatting');
    }

    this.currentSession = sessionId;
    this.executionContext.sessionId = sessionId;

    try {
      // Build conversation context
      const context = await this._buildContext(message, sessionId);

      // Get available tools
      const tools = await this._getAvailableTools();

      // Send to LLM
      const response = await this.llmClient.chat({
        messages: context.messages,
        tools: tools,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      // Handle tool calls if present
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults = await this._executeToolCalls(response.toolCalls);

        // Continue conversation with tool results
        const followUpResponse = await this._continueWithToolResults(
          context.messages,
          response,
          toolResults
        );

        return followUpResponse;
      }

      return response;

    } catch (error) {
      console.error('AgentCore chat error:', error);
      return {
        content: `I encountered an error: ${error.message}. Please try again.`,
        error: true,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }
  }

  /**
   * Execute a tool directly (for testing or manual execution)
   * @param {string} toolName - Name of the tool to execute
   * @param {object} args - Tool arguments
   * @returns {Promise<ToolResult>}
   */
  async executeTool(toolName, args) {
    if (!this.isInitialized) {
      throw new Error('AgentCore must be initialized before tool execution');
    }

    return await this.toolDispatcher.execute(toolName, args, this.executionContext);
  }

  /**
   * Load a repository context
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<void>}
   */
  async loadRepository(owner, repo) {
    this.executionContext.repo = `${owner}/${repo}`;

    // Notify tool dispatcher of repository change
    await this.toolDispatcher.setRepository(`${owner}/${repo}`);
  }

  /**
   * Get the current status of the agent
   * @returns {object} Status information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      sessionId: this.currentSession,
      repository: this.executionContext?.repo,
      config: {
        model: this.config?.model,
        temperature: this.config?.temperature,
        maxTokens: this.config?.maxTokens
      }
    };
  }

  /**
   * Handle incoming messages from the main thread
   * @param {MessageEvent} event - Message event
   */
  handleMessage(event) {
    if (this.messageHandler) {
      this.messageHandler.handle(event);
    }
  }

  /**
   * Build conversation context for LLM
   * @private
   * @param {string} message - Current user message
   * @param {string} sessionId - Session ID
   * @returns {Promise<Context>} Context object
   */
  async _buildContext(message, sessionId) {
    // This will be enhanced when we integrate with SessionManager and ContextBuilder
    const messages = [
      {
        role: 'system',
        content: this._getSystemPrompt()
      },
      {
        role: 'user',
        content: message
      }
    ];

    return { messages };
  }

  /**
   * Get available tools for the current context
   * @private
   * @returns {Promise<ToolDefinition[]>} Array of tool definitions
   */
  async _getAvailableTools() {
    // This will be enhanced when we integrate with ToolRegistry
    return [
      {
        type: 'function',
        function: {
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
          }
        }
      },
      {
        type: 'function',
        function: {
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
          }
        }
      },
      {
        type: 'function',
        function: {
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
          }
        }
      }
    ];
  }

  /**
   * Execute tool calls from LLM response
   * @private
   * @param {ToolCall[]} toolCalls - Tool calls to execute
   * @returns {Promise<ToolResult[]>} Tool execution results
   */
  async _executeToolCalls(toolCalls) {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await this.toolDispatcher.execute(
          toolCall.function.name,
          args,
          this.executionContext
        );

        results.push({
          toolCallId: toolCall.id,
          result: result
        });

      } catch (error) {
        console.error(`Tool execution error for ${toolCall.function.name}:`, error);
        results.push({
          toolCallId: toolCall.id,
          result: {
            success: false,
            error: error.message
          }
        });
      }
    }

    return results;
  }

  /**
   * Continue conversation with tool results
   * @private
   * @param {Message[]} messages - Previous messages
   * @param {ChatResponse} originalResponse - Original LLM response
   * @param {ToolResult[]} toolResults - Tool execution results
   * @returns {Promise<ChatResponse>} Follow-up response
   */
  async _continueWithToolResults(messages, originalResponse, toolResults) {
    // Add assistant message with tool calls
    const updatedMessages = [...messages, {
      role: 'assistant',
      content: originalResponse.content,
      toolCalls: originalResponse.toolCalls
    }];

    // Add tool results
    for (const toolResult of toolResults) {
      updatedMessages.push({
        role: 'tool',
        toolCallId: toolResult.toolCallId,
        content: JSON.stringify(toolResult.result)
      });
    }

    // Get follow-up response
    const followUpResponse = await this.llmClient.chat({
      messages: updatedMessages,
      tools: await this._getAvailableTools(),
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens
    });

    return followUpResponse;
  }

  /**
   * Get the system prompt for the agent
   * @private
   * @returns {string} System prompt
   */
  _getSystemPrompt() {
    return `You are Aardvark, an intelligent AI coding assistant. You help developers with various coding tasks including:

- Writing and modifying code
- Debugging and error analysis
- Code review and optimization
- File system operations
- Running tests and commands
- UI/UX development

You have access to tools that allow you to:
- Execute JavaScript code safely
- Read and write files
- Run terminal commands
- Interact with the user interface

Always be helpful, accurate, and provide clear explanations for your actions. When using tools, explain what you're doing and why.`;
  }
}
