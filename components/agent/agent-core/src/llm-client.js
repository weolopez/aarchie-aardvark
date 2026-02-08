/**
 * LLM Client - OpenAI API Integration
 *
 * Handles communication with LLM APIs, including chat completion,
 * tool calling, and streaming support.
 */

export class LLMClient {
  constructor(config) {
    this.config = config;
    this.apiBaseUrl = config.apiBaseUrl || 'https://api.openai.com/v1';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4';
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
      maxTokens = this.defaultMaxTokens
    } = options;

    const requestBody = {
      model: this.model,
      messages: this._formatMessages(messages),
      temperature,
      max_tokens: maxTokens,
      stream: false
    };

    // Add tools if provided
    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API request failed: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return this._parseResponse(data);

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
      maxTokens = this.defaultMaxTokens
    } = options;

    const requestBody = {
      model: this.model,
      messages: this._formatMessages(messages),
      temperature,
      max_tokens: maxTokens,
      stream: true
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
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
   * Format messages for API consumption
   * @private
   * @param {Message[]} messages - Raw messages
   * @returns {Message[]} Formatted messages
   */
  _formatMessages(messages) {
    return messages.map(message => {
      const formatted = {
        role: message.role,
        content: message.content
      };

      // Handle tool calls
      if (message.toolCalls) {
        formatted.tool_calls = message.toolCalls.map(call => ({
          id: call.id,
          type: call.type || 'function',
          function: {
            name: call.function.name,
            arguments: call.function.arguments
          }
        }));
      }

      // Handle tool results
      if (message.role === 'tool') {
        formatted.tool_call_id = message.toolCallId;
      }

      return formatted;
    });
  }

  /**
   * Parse API response into our format
   * @private
   * @param {object} data - Raw API response
   * @returns {ChatResponse} Parsed response
   */
  _parseResponse(data) {
    const choice = data.choices[0];
    if (!choice) {
      throw new Error('No response choices received from API');
    }

    const response = {
      content: choice.message.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };

    // Handle tool calls
    if (choice.message.tool_calls) {
      response.toolCalls = choice.message.tool_calls.map(call => ({
        id: call.id,
        type: call.type,
        function: {
          name: call.function.name,
          arguments: call.function.arguments
        }
      }));
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
   * Get available models (mock implementation)
   * @returns {string[]} Available model names
   */
  getAvailableModels() {
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];
  }
}
