/**
 * LLM Client - Gemini API Integration
 *
 * Handles communication with LLM APIs, including chat completion,
 * tool calling, and streaming support.
 */

export class LLMClient {
  constructor(config = {}) {
    this.config = config;
    
    // Fallback logic for environment variables in both Node and Browser
    const getEnv = (key, defaultValue) => {
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
      }
      if (typeof localStorage !== 'undefined') {
        const value = localStorage.getItem(key);
        if (value) return value;
      }
      return defaultValue;
    };

    // Use environment variables if available
    this.apiBaseUrl = config.apiBaseUrl !== undefined ? config.apiBaseUrl : getEnv('GEMINI_URL', 'https://generativelanguage.googleapis.com/v1beta');
    this.model = config.model !== undefined ? config.model : getEnv('GEMINI_MODEL', 'gemini-2.5-flash');
    this.apiKey = config.apiKey !== undefined ? config.apiKey : getEnv('GEMINI_API_KEY');
    this.defaultMaxTokens = config.maxTokens || 4096;
    this.defaultTemperature = config.temperature || 0.7;
  }

  /**
   * Send a chat completion request
   * @param {object} options - Chat options
   * @param {Message[]} options.messages - Conversation messages
   * @param {ToolDefinition[]} options.tools - Available tools
   * @param {number} options.temperature - Temperature setting
   * @param {number} options.maxTokens - Maximum tokens
   * @returns {Promise<ChatResponse>}
   */
  async chat(options) {
    const {
      messages,
      tools = [],
      temperature = this.defaultTemperature,
      maxTokens = this.defaultMaxTokens,
      systemInstruction
    } = options;

  const url = `${this.apiBaseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: this._formatMessagesForGemini(messages),
      systemInstruction: {
        parts: [{ text: systemInstruction || "You are a helpful assistant. Answer questions directly and factually." }]
      },
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    };

    // Add tools if provided
    if (tools.length > 0) {
      requestBody.tools = this._formatToolsForGemini(tools);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API request failed: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return this._parseGeminiResponse(data);

    } catch (error) {
      console.error('LLM API error:', error);
      throw new Error(`Failed to communicate with LLM API: ${error.message}`);
    }
  }

  /**
   * Stream a chat completion (for real-time responses)
   * @param {object} options - Chat options
   * @param {function} onChunk - Callback for each chunk
   * @returns {Promise<ChatResponse>}
   */
  async chatStream(options, onChunk) {
    const {
      messages,
      tools = [],
      temperature = this.defaultTemperature,
      maxTokens = this.defaultMaxTokens,
      systemInstruction
    } = options;

    const requestBody = {
      contents: this._formatMessagesForGemini(messages),
      systemInstruction: {
        parts: [{ text: systemInstruction || "You are a helpful assistant. Answer questions directly and factually." }]
      },
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    };

    if (tools.length > 0) {
      requestBody.tools = this._formatToolsForGemini(tools);
    }

    // Gemini streaming endpoint is not used here, but if needed, update to use env URL
    try {
      const response = await fetch(`${this.apiBaseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API request failed: ${error.error?.message || response.statusText}`);
      }

      return await this._handleStream(response, onChunk);

    } catch (error) {
      console.error('LLM streaming error:', error);
      throw new Error(`Failed to stream from LLM API: ${error.message}`);
    }
  }

  /**
   * Format messages for Gemini API
   * @private
   * @param {Message[]} messages - Raw messages
   * @returns {object[]} Formatted contents
   */
  _formatMessagesForGemini(messages) {
    // Gemini expects a single content with conversation history in parts
    const parts = [];

    for (const message of messages) {
      let text = '';

      // Handle system messages by including them in the conversation
      if (message.role === 'system') {
        text = `System: ${message.content}`;
      } else if (message.role === 'user') {
        text = message.content;
      } else if (message.role === 'assistant') {
        text = message.content;
      } else if (message.role === 'tool') {
        text = `Tool result: ${message.content}`;
      }

      if (text) {
        parts.push({ text });
      }
    }

    return [{
      parts: parts
    }];
  }

  /**
   * Format tools for Gemini API
   * @private
   * @param {ToolDefinition[]} tools - Raw tools
   * @returns {object[]} Formatted tools
   */
  _formatToolsForGemini(tools) {
    return [{
      functionDeclarations: tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }))
    }];
  }

  /**
   * Parse Gemini API response into our format
   * @private
   * @param {object} data - Raw Gemini response
   * @returns {ChatResponse} Parsed response
   */
  _parseGeminiResponse(data) {

    console.log('[LLMClient] Raw Gemini API response:', JSON.stringify(data));
    const candidate = data && data.candidates && data.candidates[0];
    if (!candidate) {
      console.error('[LLMClient] No response candidates received from Gemini API:', JSON.stringify(data));
      return {
        content: '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        error: 'No response candidates received from Gemini API'
      };
    }

    // Defensive: usageMetadata may be missing
    const usageMeta = data && data.usageMetadata ? data.usageMetadata : {};
    const response = {
      content: '',
      usage: {
        promptTokens: usageMeta.promptTokenCount || 0,
        completionTokens: usageMeta.candidatesTokenCount || 0,
        totalTokens: usageMeta.totalTokenCount || 0
      }
    };

    // Extract content
    if (candidate.content && candidate.content.parts) {
      response.content = candidate.content.parts
        .filter(part => part.text)
        .map(part => {
          // Remove thoughtSignature if present
          const text = part.text;
          if (text.includes('thoughtSignature')) {
            return text.split('thoughtSignature')[0].trim();
          }
          return text;
        })
        .join('');
    }

    // Handle function calls
    if (candidate.content && candidate.content.parts) {
      const functionCalls = candidate.content.parts
        .filter(part => part.functionCall)
        .map(part => part.functionCall);

      if (functionCalls.length > 0) {
        response.toolCalls = functionCalls.map((call, index) => ({
          id: `call-${Date.now()}-${index}`,
          type: 'function',
          function: {
            name: call.name,
            arguments: JSON.stringify(call.args || {})
          }
        }));
      }
    }

    return response;
  }

  /**
   * Handle streaming response
   * @private
   * @param {Response} response - Fetch response
   * @param {function} onChunk - Chunk callback
   * @returns {Promise<ChatResponse>}
   */
  async _handleStream(response, onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResponse = {
      content: '',
      toolCalls: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              continue;
            }

            try {
              const chunk = JSON.parse(data);
              const delta = chunk.choices[0]?.delta;

              if (delta) {
                // Handle content
                if (delta.content) {
                  finalResponse.content += delta.content;
                  if (onChunk) {
                    onChunk({ type: 'content', content: delta.content });
                  }
                }

                // Handle tool calls
                if (delta.tool_calls) {
                  for (const toolCall of delta.tool_calls) {
                    if (!finalResponse.toolCalls[toolCall.index]) {
                      finalResponse.toolCalls[toolCall.index] = {
                        id: toolCall.id,
                        type: toolCall.type,
                        function: { name: '', arguments: '' }
                      };
                    }

                    const call = finalResponse.toolCalls[toolCall.index];
                    if (toolCall.function?.name) {
                      call.function.name += toolCall.function.name;
                    }
                    if (toolCall.function?.arguments) {
                      call.function.arguments += toolCall.function.arguments;
                    }
                  }

                  if (onChunk) {
                    onChunk({ type: 'tool_calls', toolCalls: finalResponse.toolCalls });
                  }
                }
              }

              // Handle usage information
              if (chunk.usage) {
                finalResponse.usage = {
                  promptTokens: chunk.usage.prompt_tokens,
                  completionTokens: chunk.usage.completion_tokens,
                  totalTokens: chunk.usage.total_tokens
                };
              }

            } catch (parseError) {
              // Skip malformed chunks
              console.warn('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }

      return finalResponse;

    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if the API key is configured
   * @returns {boolean} True if API key is set
   */
  isConfigured() {
  return Boolean(this.apiKey);
  }

  /**
   * Get available models (Gemini models)
   * @returns {string[]} Available model names
   */
  getAvailableModels() {
    return [
      this.model
    ];
  }
}
