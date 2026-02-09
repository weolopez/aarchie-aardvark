/**
 * Context Builder - Core context optimization engine
 *
 * Orchestrates tool analysis, conversation optimization, and prompt building
 * to create optimal context for LLM interactions.
 */

import { ToolAnalyzer } from './tool-analyzer.js';
import { ConversationOptimizer } from './conversation-optimizer.js';
import { PromptBuilder } from './prompt-builder.js';
import { ContextManager } from './context-manager.js';

export class ContextBuilder {
  /**
   * Create a new ContextBuilder
   * @param {ToolRegistry} toolRegistry - Tool registry instance
   * @param {SessionManager} sessionManager - Session manager instance
   */
  constructor(toolRegistry, sessionManager) {
    this.toolAnalyzer = new ToolAnalyzer(toolRegistry);
    this.conversationOptimizer = new ConversationOptimizer(sessionManager);
    this.promptBuilder = new PromptBuilder(this.toolAnalyzer, this.conversationOptimizer);
    this.contextManager = new ContextManager(this.promptBuilder, this.conversationOptimizer);
  }

  /**
   * Build complete context for a user query
   * @param {string} sessionId - Session identifier
   * @param {string} userQuery - User query
   * @param {number} maxTokens - Maximum token limit (default: 8000)
   * @returns {Object} Complete context object
   */
  async buildContext(sessionId, userQuery, maxTokens = 8000) {
    // Get session tree
    const sessionTree = await this.getSessionTree(sessionId);
    if (!sessionTree) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Find relevant tools (array of {tool, score})
    const relevantTools = await this.toolAnalyzer.findRelevantTools(userQuery);

    // Build optimized prompt (pass only tool objects)
    const prompt = await this.promptBuilder.buildPrompt(
      userQuery,
      sessionTree,
      relevantTools.map(rt => rt.tool),
      maxTokens
    );

    // Optimize if needed
    const optimizedPrompt = await this.promptBuilder.optimizePrompt(prompt, sessionTree);

    // Update context window
    await this.contextManager.updateContextWindow(sessionId, optimizedPrompt.messages, maxTokens);

    return {
      sessionId,
      prompt: optimizedPrompt,
      relevantTools: relevantTools, // array of {tool, score}
      contextStats: this.contextManager.getContextStats(sessionId)
    };
  }

  /**
   * Get tool capabilities for analysis
   * @returns {Array<Object>} Tool capabilities
   */
  async getToolCapabilities() {
    return await this.toolAnalyzer.getToolCapabilities();
  }

  /**
   * Optimize conversation for a session
   * @param {string} sessionId - Session identifier
   * @param {number} maxTokens - Maximum token limit
   * @returns {Array<Object>} Optimized conversation
   */
  async optimizeConversation(sessionId, maxTokens = 4000) {
    const sessionTree = await this.getSessionTree(sessionId);
    if (!sessionTree) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return await this.conversationOptimizer.compressHistory(sessionTree, maxTokens);
  }

  /**
   * Get current context window for a session
   * @param {string} sessionId - Session identifier
   * @returns {Array<Object>} Current context messages
   */
  getCurrentContext(sessionId) {
    return this.contextManager.getCurrentContext(sessionId);
  }

  /**
   * Get context statistics
   * @param {string} sessionId - Session identifier
   * @returns {Object} Context statistics
   */
  getContextStats(sessionId) {
    return this.contextManager.getContextStats(sessionId);
  }

  /**
   * Clear context for a session
   * @param {string} sessionId - Session identifier
   */
  clearContext(sessionId) {
    this.contextManager.clearContextWindow(sessionId);
  }

  /**
   * Get session tree from session manager
   * @param {string} sessionId - Session identifier
   * @returns {SessionTree|null} Session tree or null if not found
   */
  async getSessionTree(sessionId) {
    return await this.conversationOptimizer.sessionManager.getTree(sessionId);
  }

  /**
   * Check if context needs optimization
   * @param {string} sessionId - Session identifier
   * @param {number} maxTokens - Maximum token limit
   * @returns {boolean} Whether optimization is needed
   */
  needsOptimization(sessionId, maxTokens = 8000) {
    return this.contextManager.needsOptimization(sessionId, maxTokens);
  }

  /**
   * Get all active sessions
   * @returns {Array<string>} Active session IDs
   */
  getActiveSessions() {
    return this.contextManager.getActiveSessions();
  }

  /**
   * Clean up old contexts
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {number} Number of contexts cleaned up
   */
  cleanupOldContexts(maxAge = 3600000) {
    return this.contextManager.cleanupOldContexts(maxAge);
  }
}
