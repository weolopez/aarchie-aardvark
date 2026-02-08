/**
 * Agent Configuration - Configuration Management
 *
 * Handles agent configuration validation, defaults, and environment setup.
 */

export class AgentConfig {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.apiBaseUrl = options.apiBaseUrl || 'https://generativelanguage.googleapis.com/v1';
    this.model = options.model || 'gemini-pro';
    this.maxTokens = options.maxTokens || 4096;
    this.temperature = options.temperature || 0.7;
    this.defaultPermissions = options.defaultPermissions || ['fs', 'network', 'ui'];
    this.timeout = options.timeout || 30000;
    this.streaming = options.streaming !== false; // Default to true
    this.debug = options.debug || false;
  }

  /**
   * Validate configuration object
   * @param {object} config - Raw configuration
   * @returns {AgentConfig} Validated configuration
   */
  static validate(config) {
    if (!config) {
      throw new Error('Configuration is required');
    }

    if (typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }

    // Required fields
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    // Validate API key format (basic check)
    if (typeof config.apiKey !== 'string' || config.apiKey.length < 20) {
      throw new Error('API key appears to be invalid');
    }

    // Validate model
    const validModels = ['gemini-pro'];
    if (config.model && !validModels.includes(config.model)) {
      console.warn(`Unknown model '${config.model}'. Valid models: ${validModels.join(', ')}`);
    }

    // Validate numeric fields
    if (config.maxTokens && (typeof config.maxTokens !== 'number' || config.maxTokens < 1)) {
      throw new Error('maxTokens must be a positive number');
    }

    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
        throw new Error('temperature must be a number between 0 and 2');
      }
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 1000)) {
      throw new Error('timeout must be a number >= 1000ms');
    }

    // Validate permissions
    if (config.defaultPermissions) {
      const validPermissions = ['fs', 'network', 'ui'];
      const invalidPerms = config.defaultPermissions.filter(p => !validPermissions.includes(p));
      if (invalidPerms.length > 0) {
        throw new Error(`Invalid permissions: ${invalidPerms.join(', ')}. Valid: ${validPermissions.join(', ')}`);
      }
    }

    return new AgentConfig(config);
  }

  /**
   * Create configuration from environment variables
   * @returns {AgentConfig} Configuration from environment
   */
  static fromEnvironment() {
    return new AgentConfig({
      apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
      apiBaseUrl: process.env.OPENAI_API_BASE_URL,
      model: process.env.OPENAI_MODEL,
      maxTokens: process.env.OPENAI_MAX_TOKENS ? parseInt(process.env.OPENAI_MAX_TOKENS) : undefined,
      temperature: process.env.OPENAI_TEMPERATURE ? parseFloat(process.env.OPENAI_TEMPERATURE) : undefined,
      debug: process.env.DEBUG === 'true' || process.env.DEBUG === '1'
    });
  }

  /**
   * Get default configuration for development
   * @returns {AgentConfig} Default development config
   */
  static getDefault() {
    return new AgentConfig({
      apiKey: 'sk-test-key-for-development',
      apiBaseUrl: 'https://generativelanguage.googleapis.com/v1',
      model: 'gemini-pro',
      maxTokens: 2048,
      temperature: 0.7,
      defaultPermissions: ['fs', 'network', 'ui'],
      timeout: 30000,
      streaming: true,
      debug: true
    });
  }

  /**
   * Export configuration as plain object
   * @returns {object} Plain configuration object
   */
  toObject() {
    return {
      apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : null, // Mask API key
      apiBaseUrl: this.apiBaseUrl,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      defaultPermissions: this.defaultPermissions,
      timeout: this.timeout,
      streaming: this.streaming,
      debug: this.debug
    };
  }

  /**
   * Check if configuration is valid for API calls
   * @returns {boolean} True if configuration is valid
   */
  isValid() {
    try {
      return Boolean(
        this.apiKey &&
        this.apiKey.length > 20 &&
        this.model &&
        typeof this.maxTokens === 'number' &&
        this.maxTokens > 0 &&
        typeof this.temperature === 'number' &&
        this.temperature >= 0 &&
        this.temperature <= 2
      );
    } catch {
      return false;
    }
  }

  /**
   * Get configuration summary (safe for logging)
   * @returns {string} Configuration summary
   */
  getSummary() {
    return `Model: ${this.model}, Max Tokens: ${this.maxTokens}, Temp: ${this.temperature}, Permissions: ${this.defaultPermissions.join(', ')}`;
  }
}
