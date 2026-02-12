// src/agent/protocol.js - Message protocol definitions and validation
export class Protocol {
  constructor(controller) {
    this.controller = controller;
  }

  async handleInit(message) {
    try {
      console.log('[Protocol] handleInit called with:', message);
      this.validateMessage(message);
      const { id, payload } = message;
      await this.controller.agent.init(payload, this.controller.messageBridge);
      this.controller.messageBridge.send('response', {
        id,
        success: true
      });
    } catch (error) {
      console.error('[Protocol] handleInit error:', error);
      this.controller.messageBridge.send('response', {
        id: message.id,
        success: false,
        error: error.message
      });
    }
  }

  async handleChat(message) {
    try {
      console.log('[Protocol] handleChat called with:', message);
      this.validateMessage(message);
      const { id, payload } = message;
      let response;
      try {
        response = await this.controller.agent.chat(payload.message, payload.sessionId);
      } catch (chatError) {
        // Log and forward chat errors
        console.error('[Protocol] agent.chat error:', chatError);
        this.controller.messageBridge.send('response', {
          id,
          success: false,
          error: chatError && chatError.stack ? chatError.stack : String(chatError)
        });
        return;
      }
      this.controller.messageBridge.send('response', {
        id,
        success: true,
        result: response
      });
    } catch (error) {
      console.error('[Protocol] handleChat error:', error);
      this.controller.messageBridge.send('response', {
        id: message.id,
        success: false,
        error: error && error.stack ? error.stack : String(error)
      });
    }
  }

  handleApproveTool(message) {
    try {
      this.validateMessage(message);
      const { id, payload } = message;
      // Forward to agent for tool execution
      this.controller.agent.approveTool(payload.toolId, payload.approved);
    } catch (error) {
      this.controller.messageBridge.send('response', {
        id: message.id,
        success: false,
        error: error.message
      });
    }
  }

  handleLoadRepo(message) {
    try {
      this.validateMessage(message);
      const { id, payload } = message;
      // Placeholder for repository loading - will be implemented in Phase 2
      this.controller.messageBridge.send('response', {
        id,
        success: true,
        result: { message: 'Repository loading not yet implemented' }
      });
    } catch (error) {
      this.controller.messageBridge.send('response', {
        id: message.id,
        success: false,
        error: error.message
      });
    }
  }

  // Message validation
  validateMessage(message) {
    if (!message.type) {
      throw new Error('Message must have a type');
    }

    if (!message.id) {
      throw new Error('Message must have an id');
    }

    switch (message.type) {
      case 'init':
        if (!message.payload?.apiKey) {
          throw new Error('Init message must include apiKey');
        }
        break;
      case 'chat':
        if (!message.payload?.message || !message.payload?.sessionId) {
          throw new Error('Chat message must include message and sessionId');
        }
        break;
      case 'approve_tool':
        if (!message.payload?.toolId || typeof message.payload?.approved !== 'boolean') {
          throw new Error('Approve tool message must include toolId and approved boolean');
        }
        break;
      case 'load_repo':
        if (!message.payload?.owner || !message.payload?.repo) {
          throw new Error('Load repo message must include owner and repo');
        }
        break;
    }

    return true;
  }
}
