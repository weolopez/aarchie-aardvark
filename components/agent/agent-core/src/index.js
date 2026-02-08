/**
 * Agent Core - Main Exports
 *
 * The Agent Core provides AI-powered coding assistance with tool execution,
 * conversation management, and intelligent code analysis capabilities.
 */

export { AgentCore } from './agent-core.js';
export { LLMClient } from './llm-client.js';
export { ToolDispatcher } from './tool-dispatcher.js';
export { MessageHandler } from './message-handler.js';
export { AgentConfig } from './config.js';

// Web Worker entry point for direct worker usage
if (typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
  // Running in Web Worker context
  const agentCore = new AgentCore();

  self.onmessage = (event) => {
    agentCore.handleMessage(event);
  };

  // Send ready signal
  self.postMessage({
    type: 'ready',
    timestamp: Date.now()
  });
}
