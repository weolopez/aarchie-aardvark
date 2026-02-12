// src/agent/agent.js - Agent instantiation and lifecycle management
import { APIClient } from '../../components/core/api-client/src/index.js';

export class Agent {
  constructor() {
    this.apiClient = null;
    this.config = null;
    this.messageBridge = null;
  }

  async init(config, messageBridge) {
    this.config = config;
    this.messageBridge = messageBridge;

    this.apiClient = new APIClient();
    await this.apiClient.initialize({
      provider: config.provider || 'gemini',
      apiKey: config.apiKey,
      model: config.model || 'gemini-2.5-flash',
      timeout: config.timeout || 30000,
      retries: config.retries || 3
    });
  }

  async chat(message, sessionId) {
    try {
      console.log('[Agent] chat called with message:', message, 'sessionId:', sessionId);
      const response = await this.apiClient.streamRequest(
        {
          messages: [{ role: 'user', content: message }],
          systemInstruction: this.config.systemInstruction || "You are a helpful AI assistant. Answer questions directly and factually.",
          temperature: this.config.temperature || 0.7,
          maxTokens: this.config.maxTokens || 4096
        },
        (chunk) => {
          console.log('[Agent] Streaming chunk:', chunk);
          // Forward streaming chunks via Message Bridge
          this.messageBridge.send('step', {
            content: chunk,
            sessionId,
            done: false
          });
        }
      );
      // Send completion signal
      console.log('[Agent] LLM streaming complete, response:', response);
      const safeUsage = (response && response.usage) ? response.usage : { prompt: 0, completion: 0, total: 0 };
      this.messageBridge.send('step', {
        content: '',
        sessionId,
        done: true,
        usage: safeUsage
      });
      return response;
    } catch (error) {
      console.error('[Agent] LLM request failed:', error);
      this.messageBridge.send('error', {
        message: 'LLM request failed',
        details: error.message
      });
      throw error;
    }
  }

  approveTool(toolId, approved) {
    // Placeholder for tool approval - will be implemented in Phase 3
    this.messageBridge.send('tool_result', {
      toolId,
      approved,
      result: approved ? 'Tool execution approved' : 'Tool execution denied'
    });
  }
}
