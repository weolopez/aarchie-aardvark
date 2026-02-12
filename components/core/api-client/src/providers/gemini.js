/**
 * GeminiProvider - Google Gemini API implementation
 * Supports both streaming and non-streaming requests
 */

import { BaseProvider } from './base.js';

export class GeminiProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.model = config.model || 'gemini-2.5-flash';
  }

  /**
   * Build the API URL with model and API key
   * @private
   */
  _buildUrl(endpoint) {
    // URL format: https://generativelanguage.googleapis.com/v1beta/models/{model}:{endpoint}?key={apiKey}
    if (!this.apiKey) {
      throw new Error('API key is required but not provided');
    }
    return `${this.baseUrl}/models/${this.model}:${endpoint}?key=${this.apiKey}`;
  }

  /**
   * Send a non-streaming request to Gemini API
   */
  async sendRequest(request) {
    return this._retryWithBackoff(async () => {
      const controller = this._createAbortController();
      
      try {
        const response = await fetch(
          this._buildUrl('generateContent'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this._formatRequest(request)),
            signal: controller.signal
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
          throw this._formatError(new Error(error.error?.message || `HTTP ${response.status}`), response);
        }

        const data = await response.json();
        return this._formatResponse(data);
      } finally {
        this.abortController = null;
      }
    });
  }

  /**
   * Send a streaming request to Gemini API
   */
  async streamRequest(request, onChunk) {
    return this._retryWithBackoff(async () => {
      const controller = this._createAbortController();
      try {
        const response = await fetch(
          this._buildUrl('streamGenerateContent'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this._formatRequest(request)),
            signal: controller.signal
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
          console.error('[GeminiProvider] Streaming response error:', error);
          throw this._formatError(new Error(error.error?.message || `HTTP ${response.status}`), response);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Read the entire response into buffer
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
        }

        // Try to parse the full buffer as JSON
        try {
          console.log('[GeminiProvider] Full stream buffer:', buffer);
          const json = JSON.parse(buffer);
          // Optionally, emit the text/content as a single chunk
          const text = this._extractTextFromChunk(json);
          onChunk(text);
        } catch (e) {
          console.error('[GeminiProvider] Malformed full stream buffer:', buffer, e);
          onChunk('');
        }
      } finally {
        this.abortController = null;
      }
    });
  }

  /**
   * Format request for Gemini API
   * @private
   */
  _formatRequest(request) {
    const formatted = {
      contents: this._formatMessages(request.messages)
    };

    // Add system instruction (required for Gemini API)
    if (request.systemInstruction) {
      formatted.systemInstruction = {
        parts: [{ text: request.systemInstruction }]
      };
    } else {
      // Default system instruction if none provided
      formatted.systemInstruction = {
        parts: [{ text: "You are a helpful assistant. Answer questions directly and factually." }]
      };
    }

    if (request.tools) {
      formatted.tools = this._formatTools(request.tools);
    }

    if (request.temperature !== undefined || request.maxTokens !== undefined) {
      formatted.generationConfig = {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 4096
      };
    }

    return formatted;
  }

  /**
   * Format messages for Gemini
   * @private
   */
  _formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
  }

  /**
   * Format tools for Gemini
   * @private
   */
  _formatTools(tools) {
    return tools.map(tool => ({
      functionDeclarations: [{
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }]
    }));
  }

  /**
   * Format response from Gemini
   * @private
   */
  _formatResponse(data) {
    console.log('[GeminiProvider] Raw Gemini API response:', JSON.stringify(data));
    const candidate = data && data.candidates && data.candidates[0];
    const content = candidate && candidate.content;
    if (!content) {
      console.error('[GeminiProvider] No content in Gemini API response:', JSON.stringify(data));
      return {
        content: '',
        toolCalls: undefined,
        usage: { prompt: 0, completion: 0, total: 0 },
        finishReason: candidate ? candidate.finishReason : undefined,
        error: 'No content in Gemini API response'
      };
    }

    const text = content.parts?.[0]?.text || '';
    const toolCalls = this._extractToolCalls(content);
    // Defensive: usageMetadata may be missing
    const usageMeta = data && data.usageMetadata ? data.usageMetadata : {};
    return {
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        prompt: usageMeta.promptTokenCount || 0,
        completion: usageMeta.candidatesTokenCount || 0,
        total: usageMeta.totalTokenCount || 0
      },
      finishReason: candidate.finishReason
    };
  }

  /**
   * Extract text from streaming chunk
   * @private
   */
  _extractTextFromChunk(chunk) {
    return chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Extract tool calls from content
   * @private
   */
  _extractToolCalls(content) {
    if (!content.parts) return [];
    
    return content.parts
      .filter(part => part.functionCall)
      .map(part => ({
        name: part.functionCall.name,
        arguments: part.functionCall.args
      }));
  }

  /**
   * Get token count for Gemini (approximate)
   * Gemini uses ~4 characters per token on average
   */
  getTokenCount(text) {
    return Math.ceil(text.length / 4);
  }
}

export default GeminiProvider;
