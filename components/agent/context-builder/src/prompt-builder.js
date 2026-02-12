/**
 * Prompt Builder - Token-aware prompt construction
 *
 * Builds optimized prompts that leverage available tools and
 * include relevant conversation context within token limits.
 */

export class PromptBuilder {
  /**
   * Create a new PromptBuilder
   * @param {ToolAnalyzer} toolAnalyzer - Tool analyzer instance
   * @param {ConversationOptimizer} conversationOptimizer - Conversation optimizer instance
   */
  constructor(toolAnalyzer, conversationOptimizer) {
    this.toolAnalyzer = toolAnalyzer;
    this.conversationOptimizer = conversationOptimizer;
  }

  /**
   * Build an optimized prompt for LLM interaction
   * @param {string} userQuery - Current user query
   * @param {SessionTree} sessionTree - Current session tree
   * @param {Array<Object>} relevantTools - Pre-filtered relevant tools
   * @param {number} maxTokens - Maximum token limit
   * @returns {Object} Prompt object with content and metadata
   */
  async buildPrompt(userQuery, sessionTree, relevantTools = [], maxTokens = 8000) {
    const optimizedHistory = await this.conversationOptimizer.compressHistory(sessionTree, maxTokens);

    // Build system prompt with tool context
    const systemPrompt = this.buildSystemPrompt(relevantTools);

    // Combine history and current query
    const messages = [
      { role: 'system', content: systemPrompt },
      ...optimizedHistory,
      { role: 'user', content: userQuery }
    ];

    // Calculate token usage
    const tokenUsage = this.calculateTokenUsage(messages);

    return {
      messages,
      tokenUsage,
      relevantTools: relevantTools,
      optimizedHistory
    };
  }

  /**
   * Build system prompt with tool capabilities
   * @param {Array<Object>} relevantTools - Tools to include in prompt
   * @returns {string} System prompt content
   */
  buildSystemPrompt(relevantTools) {
    let prompt = `You are an intelligent coding assistant with access to various tools. `;

    if (relevantTools && relevantTools.length > 0) {
      prompt += `You have access to the following tools:\n\n`;

      for (const tool of relevantTools) {
        prompt += `**${tool.name}**: ${tool.description || 'No description'}\n`;

        if (tool.functions && tool.functions.length > 0) {
          prompt += `Functions:\n`;
          for (const func of tool.functions) {
            prompt += `  - ${func.name}: ${func.description || 'No description'}\n`;
          }
        }

        if (tool.permissions && tool.permissions.length > 0) {
          prompt += `Permissions: ${tool.permissions.join(', ')}\n`;
        }

        prompt += `\n`;
      }

      prompt += `When you need to use a tool, respond with a tool_call in the specified JSON format.\n\n`;
    } else {
      prompt += `You can execute JavaScript code to help with tasks.\n\n`;
    }

    prompt += `Always provide helpful, accurate responses and use tools when appropriate.`;

    return prompt;
  }

  /**
   * Calculate token usage for messages
   * @param {Array<Object>} messages - Messages to analyze
   * @returns {Object} Token usage statistics
   */
  calculateTokenUsage(messages) {
    let totalTokens = 0;

    for (const message of messages) {
      totalTokens += this.estimateTokens(message);
    }

    return {
      current: totalTokens,
      limit: 8000, // Default GPT-4 limit
      remaining: Math.max(0, 8000 - totalTokens),
      utilization: (totalTokens / 8000) * 100
    };
  }

  /**
   * Estimate token count for a message
   * @param {Object} message - Message object
   * @returns {number} Estimated token count
   */
  estimateTokens(message) {
    if (!message || !message.content) return 0;

    // Rough estimation: ~4 characters per token for English text
    // Add overhead for message structure and special tokens
    const contentTokens = Math.ceil(message.content.length / 4);
    const overhead = message.role === 'system' ? 20 : 10;

    return contentTokens + overhead;
  }

  /**
   * Validate prompt fits within token limits
   * @param {Object} prompt - Prompt object from buildPrompt
   * @returns {boolean} Whether prompt is valid
   */
  validatePrompt(prompt) {
    return prompt.tokenUsage.current <= prompt.tokenUsage.limit;
  }

  /**
   * Optimize prompt if it exceeds token limits
   * @param {Object} prompt - Prompt object from buildPrompt
   * @param {SessionTree} sessionTree - Session tree for re-optimization
   * @returns {Object} Optimized prompt
   */
  async optimizePrompt(prompt, sessionTree) {
    if (this.validatePrompt(prompt)) {
      return prompt;
    }

    // Try compressing history more aggressively
    const maxTokens = Math.floor(prompt.tokenUsage.limit * 0.8); // Leave 20% buffer
    const optimizedHistory = await this.conversationOptimizer.compressHistory(sessionTree, maxTokens);

    const messages = [
      prompt.messages[0], // Keep system prompt
      ...optimizedHistory,
      prompt.messages[prompt.messages.length - 1] // Keep user query
    ];

    return {
      ...prompt,
      messages,
      tokenUsage: this.calculateTokenUsage(messages),
      optimizedHistory
    };
  }
}
