/**
 * Session Manager - Main Exports
 *
 * The Session Manager provides tree-structured conversation management
 * with branching capabilities and persistent storage.
 */

export { SessionManager } from './session-manager.js';
export { SessionTree } from './session-tree.js';
export { SessionHeader, MessageEntry, isSessionHeader, isMessageEntry } from './models.js';

// Web Worker entry point for direct worker usage
if (typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
  // Running in Web Worker context
  const sessionManager = new SessionManager();

  self.onmessage = (event) => {
    sessionManager.messageBridge.handleMessage(event);
  };
}
