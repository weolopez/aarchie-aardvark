/**
 * Context Manager - Context window management and optimization
 *
 * Manages context windows across multiple interactions, handles
 * context overflow, and provides strategies for maintaining coherence.
 */

export class ContextManager {
  /**
   * Create a new ContextManager
   * @param {PromptBuilder} promptBuilder - Prompt builder instance
   * @param {ConversationOptimizer} conversationOptimizer - Conversation optimizer instance
   */
  constructor(promptBuilder, conversationOptimizer) {
    this.promptBuilder = promptBuilder;
    this.conversationOptimizer = conversationOptimizer;
    this.contextWindows = new Map(); // sessionId -> context window
  }

  /**
   * Get or create context window for a session
   * @param {string} sessionId - Session identifier
   * @returns {Object} Context window object
   */
  getContextWindow(sessionId) {
    if (!this.contextWindows.has(sessionId)) {
      this.contextWindows.set(sessionId, {
        messages: [],
        tokenCount: 0,
        lastUpdated: Date.now(),
        metadata: {}
      });
    }
    return this.contextWindows.get(sessionId);
  }

  /**
   * Update context window with new interaction
   * @param {string} sessionId - Session identifier
   * @param {Array<Object>} newMessages - New messages to add
   * @param {number} maxTokens - Maximum token limit
   */
  async updateContextWindow(sessionId, newMessages, maxTokens = 8000) {
    const contextWindow = this.getContextWindow(sessionId);

    // Add new messages
    for (const message of newMessages) {
      const tokenCount = this.promptBuilder.estimateTokens(message);
      contextWindow.messages.push(message);
      contextWindow.tokenCount += tokenCount;
    }

    // Check if we need to optimize
    if (contextWindow.tokenCount > maxTokens) {
      await this.optimizeContextWindow(sessionId, maxTokens);
    }

    contextWindow.lastUpdated = Date.now();
  }

  /**
   * Optimize context window when it exceeds limits
   * @param {string} sessionId - Session identifier
   * @param {number} maxTokens - Maximum token limit
   */
  async optimizeContextWindow(sessionId, maxTokens = 8000) {
    const contextWindow = this.getContextWindow(sessionId);

    // Keep most recent messages within token limit
    const messages = contextWindow.messages;
    let optimizedMessages = [];
    let tokenCount = 0;

    // Process from most recent to oldest
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = this.promptBuilder.estimateTokens(message);

      if (tokenCount + messageTokens > maxTokens) {
        // If we can't fit this message, create a summary of older messages
        if (i > 0) {
          const olderMessages = messages.slice(0, i);
          const summary = await this.conversationOptimizer.summarizeMessages(olderMessages);
          const summaryTokens = this.promptBuilder.estimateTokens(summary);

          if (tokenCount + summaryTokens <= maxTokens) {
            optimizedMessages.unshift(summary);
            tokenCount += summaryTokens;
          }
        }
        break;
      }

      optimizedMessages.unshift(message);
      tokenCount += messageTokens;
    }

    contextWindow.messages = optimizedMessages;
    contextWindow.tokenCount = tokenCount;
  }

  /**
   * Get current context for a session
   * @param {string} sessionId - Session identifier
   * @returns {Array<Object>} Current context messages
   */
  getCurrentContext(sessionId) {
    const contextWindow = this.getContextWindow(sessionId);
    return contextWindow.messages;
  }

  /**
   * Clear context window for a session
   * @param {string} sessionId - Session identifier
   */
  clearContextWindow(sessionId) {
    this.contextWindows.delete(sessionId);
  }

  /**
   * Get context statistics
   * @param {string} sessionId - Session identifier
   * @returns {Object} Context statistics
   */
  getContextStats(sessionId) {
    const contextWindow = this.getContextWindow(sessionId);
    return {
      messageCount: contextWindow.messages.length,
      tokenCount: contextWindow.tokenCount,
      lastUpdated: contextWindow.lastUpdated,
      averageTokensPerMessage: contextWindow.messages.length > 0
        ? contextWindow.tokenCount / contextWindow.messages.length
        : 0
    };
  }

  /**
   * Check if context window needs optimization
   * @param {string} sessionId - Session identifier
   * @param {number} maxTokens - Maximum token limit
   * @returns {boolean} Whether optimization is needed
   */
  needsOptimization(sessionId, maxTokens = 8000) {
    const contextWindow = this.getContextWindow(sessionId);
    return contextWindow.tokenCount > maxTokens;
  }

  /**
   * Get all active context windows
   * @returns {Array<string>} Array of active session IDs
   */
  getActiveSessions() {
    return Array.from(this.contextWindows.keys());
  }

  /**
   * Clean up old context windows
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupOldContexts(maxAge = 3600000) {
    const now = Date.now();
    const toDelete = [];

    for (const [sessionId, contextWindow] of this.contextWindows) {
      if (now - contextWindow.lastUpdated > maxAge) {
        toDelete.push(sessionId);
      }
    }

    for (const sessionId of toDelete) {
      this.contextWindows.delete(sessionId);
    }

    return toDelete.length;
  }
}
