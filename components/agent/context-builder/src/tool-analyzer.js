/**
 * Tool Analyzer - Tool relevance and capability analysis
 *
 * Analyzes available tools from the Tool Registry to determine relevance
 * for user queries and extract capabilities for context building.
 */

export class ToolAnalyzer {
  /**
   * Create a new ToolAnalyzer
   * @param {ToolRegistry} toolRegistry - Tool registry instance
   */
  constructor(toolRegistry) {
    this.toolRegistry = toolRegistry;
  }

  /**
   * Score tool relevance for a given query
   * @param {Tool} tool - Tool to score
   * @param {string} query - User query
   * @returns {number} Relevance score (0-1)
   */
  async scoreToolRelevance(tool, query) {
    if (!tool || !query) return 0;

    const queryLower = query.toLowerCase();
    const toolName = tool.name.toLowerCase();
    const toolDescription = (tool.description || '').toLowerCase();

    let score = 0;

    // Name match - check if tool name contains query words or vice versa
    const queryWords = queryLower.split(/\s+/);
    for (const word of queryWords) {
      if (word.length > 3) {
        if (toolName.includes(word) || word.includes(toolName) || 
            this.levenshteinDistance(word, toolName) <= 2) {
          score += 0.8;
          break; // Only count once for name match
        }
      }
    }

    // Description keyword matches
    const descWords = toolDescription.split(/\s+/);
    for (const descWord of descWords) {
      if (descWord.length > 3) {
        for (const queryWord of queryWords) {
          if (queryWord.length > 3 && 
              (descWord.includes(queryWord) || queryWord.includes(descWord) ||
               this.levenshteinDistance(queryWord, descWord) <= 2)) {
            score += 0.2;
          }
        }
      }
    }

    // Function name matches
    if (tool.functions) {
      for (const func of tool.functions) {
        const funcName = func.name.toLowerCase();
        for (const queryWord of queryWords) {
          if (queryWord.length > 3 && 
              (funcName.includes(queryWord) || queryWord.includes(funcName))) {
            score += 0.5;
          }
        }
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  /**
   * Get all available tool capabilities
   * @returns {Array<Object>} Array of tool capability objects
   */
  async getToolCapabilities() {
    const tools = await this.toolRegistry.getAllTools();
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      functions: tool.functions || [],
      permissions: tool.permissions || []
    }));
  }

  /**
   * Find most relevant tools for a query
   * @param {string} query - User query
   * @param {number} maxResults - Maximum number of tools to return
   * @returns {Array<Object>} Array of {tool, score} objects, sorted by score
   */
  async findRelevantTools(query, maxResults = 5) {
    const tools = await this.toolRegistry.getAllTools();
    const scoredTools = [];

    for (const tool of tools) {
      const score = await this.scoreToolRelevance(tool, query);
      if (score > 0) {
        scoredTools.push({ tool, score });
      }
    }

    // Sort by score descending and return top results
    return scoredTools
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }
}
