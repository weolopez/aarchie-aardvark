/**
 * Conversation Optimizer - Session history compression and optimization
 *
 * Compresses conversation trees and branch history to fit within
 * LLM context windows while preserving important information.
 */

export class ConversationOptimizer {
  /**
   * Create a new ConversationOptimizer
   * @param {SessionManager} sessionManager - Session manager instance
   */
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Compress conversation history for context
   * @param {SessionTree} sessionTree - Session tree to compress
   * @param {number} maxTokens - Maximum token limit
   * @returns {Array<Object>} Compressed conversation history
   */
  async compressHistory(sessionTree, maxTokens = 4000) {
    const history = sessionTree.getHistory();
    if (!history || history.length === 0) return [];

    // Start with most recent messages
    const compressed = [];
    let tokenCount = 0;

    // Reserve tokens for system prompt and current message
    const reservedTokens = 1000;
    const availableTokens = maxTokens - reservedTokens;

    // Process messages from most recent to oldest
    for (let i = history.length - 1; i >= 0; i--) {
      const message = history[i];
      const messageTokens = this.estimateTokens(message);

      if (tokenCount + messageTokens > availableTokens) {
        // If we can't fit this message, summarize older messages
        if (i > 0) {
          const summary = await this.summarizeMessages(history.slice(0, i));
          const summaryTokens = this.estimateTokens(summary);
          if (tokenCount + summaryTokens <= availableTokens) {
            compressed.unshift(summary);
          }
        }
        break;
      }

      compressed.unshift(message);
      tokenCount += messageTokens;
    }

    return compressed;
  }

  /**
   * Extract key messages from conversation
   * @param {SessionTree} sessionTree - Session tree to analyze
   * @returns {Array<Object>} Key messages for context
   */
  async extractKeyMessages(sessionTree) {
    const history = sessionTree.getHistory();
    const keyMessages = [];

    for (const message of history) {
      // Always include user messages
      if (message.role === 'user') {
        keyMessages.push(message);
        continue;
      }

      // Include assistant messages that contain tool calls, actions, or important responses
      if (message.role === 'assistant') {
        const content = message.content || '';
        const actionWords = ['executed', 'created', 'built', 'installed', 'updated', 'deleted', 'tool_call'];
        const hasAction = actionWords.some(word => content.toLowerCase().includes(word));
        
        if (hasAction || content.length > 100) {
          keyMessages.push(message);
        }
      }
    }

    return keyMessages;
  }

  /**
   * Summarize a set of messages
   * @param {Array<Object>} messages - Messages to summarize
   * @returns {Object} Summary message
   */
  async summarizeMessages(messages) {
    if (!messages || messages.length === 0) {
      return { role: 'system', content: 'No previous conversation.' };
    }

    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;

    let summary = `Previous conversation: ${totalMessages} messages (${userMessages} user, ${assistantMessages} assistant). `;

    // Extract key topics or actions
    const actions = [];
    for (const message of messages) {
      if (message.role === 'assistant' && message.content) {
        if (message.content.includes('executed') || message.content.includes('created')) {
          actions.push('code execution');
        }
        if (message.content.includes('tool')) {
          actions.push('tool usage');
        }
      }
    }

    if (actions.length > 0) {
      const uniqueActions = [...new Set(actions)];
      summary += `Key activities: ${uniqueActions.join(', ')}.`;
    }

    return {
      role: 'system',
      content: summary,
      type: 'summary'
    };
  }

  /**
   * Estimate token count for a message
   * @param {Object} message - Message object
   * @returns {number} Estimated token count
   */
  estimateTokens(message) {
    if (!message || !message.content) return 0;

    // Rough estimation: ~4 characters per token
    const contentTokens = Math.ceil(message.content.length / 4);

    // Add overhead for role and metadata
    return contentTokens + 10;
  }
}
