/**
 * Message Handler - Web Worker Communication
 *
 * Handles message passing between the main thread and the Agent Core
 * running in a Web Worker. Manages the protocol for chat, tool execution,
 * and status updates.
 */

export class MessageHandler {
  constructor(agentCore) {
    this.agentCore = agentCore;
    this.messageQueue = [];
    this.isProcessing = false;
  }

  /**
   * Handle incoming message from main thread
   * @param {MessageEvent} event - Message event
   */
  async handle(event) {
    const { type, id, payload } = event.data;

    try {
      let result;

      switch (type) {
        case 'init':
          result = await this._handleInit(payload);
          break;

        case 'chat':
          result = await this._handleChat(payload);
          break;

        case 'execute_tool':
          result = await this._handleExecuteTool(payload);
          break;

        case 'load_repository':
          result = await this._handleLoadRepository(payload);
          break;

        case 'get_status':
          result = await this._handleGetStatus();
          break;

        case 'ping':
          result = { pong: true, timestamp: Date.now() };
          break;

        default:
          throw new Error(`Unknown message type: ${type}`);
      }

      // Send success response
      this._sendResponse(id, { success: true, result });

    } catch (error) {
      console.error(`Message handler error for ${type}:`, error);

      // Send error response
      this._sendResponse(id, {
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Handle agent initialization
   * @private
   * @param {AgentConfig} config - Agent configuration
   */
  async _handleInit(config) {
    await this.agentCore.init(config);
    return { message: 'Agent initialized successfully' };
  }

  /**
   * Handle chat message
   * @private
   * @param {object} payload - Chat payload
   * @param {string} payload.message - User message
   * @param {string} payload.sessionId - Session ID
   */
  async _handleChat(payload) {
    const { message, sessionId } = payload;

    if (!message) {
      throw new Error('Message is required for chat');
    }

    if (!sessionId) {
      throw new Error('Session ID is required for chat');
    }

    const response = await this.agentCore.chat(message, sessionId);
    return response;
  }

  /**
   * Handle direct tool execution
   * @private
   * @param {object} payload - Tool execution payload
   * @param {string} payload.toolName - Name of the tool
   * @param {object} payload.args - Tool arguments
   */
  async _handleExecuteTool(payload) {
    const { toolName, args } = payload;

    if (!toolName) {
      throw new Error('Tool name is required');
    }

    const result = await this.agentCore.executeTool(toolName, args || {});
    return result;
  }

  /**
   * Handle repository loading
   * @private
   * @param {object} payload - Repository payload
   * @param {string} payload.owner - Repository owner
   * @param {string} payload.repo - Repository name
   */
  async _handleLoadRepository(payload) {
    const { owner, repo } = payload;

    if (!owner || !repo) {
      throw new Error('Owner and repo are required');
    }

    await this.agentCore.loadRepository(owner, repo);
    return { message: `Repository ${owner}/${repo} loaded` };
  }

  /**
   * Handle status request
   * @private
   */
  async _handleGetStatus() {
    return this.agentCore.getStatus();
  }

  /**
   * Send response back to main thread
   * @private
   * @param {string} id - Message ID
   * @param {object} payload - Response payload
   */
  _sendResponse(id, payload) {
    if (typeof self !== 'undefined' && self.postMessage) {
      self.postMessage({
        type: 'response',
        id,
        payload,
        timestamp: Date.now()
      });
    } else {
      console.log('Response (no Web Worker context):', { id, payload });
    }
  }

  /**
   * Send notification to main thread
   * @param {string} type - Notification type
   * @param {object} data - Notification data
   */
  sendNotification(type, data) {
    if (typeof self !== 'undefined' && self.postMessage) {
      self.postMessage({
        type: 'notification',
        notificationType: type,
        data,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Send status update to main thread
   * @param {object} status - Status data
   */
  sendStatusUpdate(status) {
    this.sendNotification('status_update', status);
  }

  /**
   * Send tool execution progress update
   * @param {string} toolName - Tool being executed
   * @param {string} status - Execution status
   * @param {object} data - Additional data
   */
  sendToolProgress(toolName, status, data = {}) {
    this.sendNotification('tool_progress', {
      toolName,
      status,
      ...data
    });
  }

  /**
   * Send chat progress update (for streaming)
   * @param {string} sessionId - Session ID
   * @param {object} chunk - Response chunk
   */
  sendChatProgress(sessionId, chunk) {
    this.sendNotification('chat_progress', {
      sessionId,
      chunk
    });
  }
}
